package com.payflow.service;

import com.payflow.dto.*;
import com.payflow.exception.*;
import com.payflow.model.*;
import com.payflow.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Core payment business logic — validation, processing, retry, manual rollback, and audit trail.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentHistoryRepository historyRepository;
    private final UserRepository userRepository;
    private final ReceivingAccountService receivingAccountService;

    private static final Set<String> SUPPORTED_CURRENCIES = Set.of("INR");
    private static final BigDecimal INITIAL_BALANCE = new BigDecimal("100000.00");
    private static final int MAX_RETRIES = 3;
    private static final Map<PaymentStatus, Set<PaymentStatus>> VALID_TRANSITIONS = Map.of(
        PaymentStatus.CREATED, Set.of(PaymentStatus.VALIDATED, PaymentStatus.FAILED),
        PaymentStatus.VALIDATED, Set.of(PaymentStatus.SENT, PaymentStatus.FAILED),
        PaymentStatus.SENT, Set.of(PaymentStatus.COMPLETED, PaymentStatus.FAILED),
        PaymentStatus.FAILED, Set.of(PaymentStatus.CREATED),
        PaymentStatus.COMPLETED, Set.of()
    );
    
    /** Counter ensuring exactly 1 in 3 payments fails for demonstration/testing */
    private static final AtomicInteger PAYMENT_COUNTER = new AtomicInteger(0);

    // ──────────────── CREATE ────────────────

    @Transactional
    public PaymentResponse createPayment(CreatePaymentRequest request, String userEmail) {
        if (paymentRepository.existsByIdempotencyKey(request.getIdempotencyKey())) {
            Payment existing = paymentRepository.findByIdempotencyKey(request.getIdempotencyKey())
                    .orElseThrow();
            return toResponse(existing);
        }

        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new ResourceNotFoundException(
                ErrorCode.USER_NOT_FOUND,
                "User not found"));
        ensureBankProfile(user);

        applyReceivingAccount(request, user);
        validatePayment(request);

        Payment payment = Payment.builder()
                .idempotencyKey(request.getIdempotencyKey())
                .amount(request.getAmount())
                .currency(request.getCurrency().toUpperCase())
                .senderAccount(maskIfCardNumber(request))
                .receiverAccount(request.getReceiverAccount())
                .purpose(request.getPurpose())
                .cardHolderName(request.getCardHolderName())
                .cardExpiry(request.getCardExpiry())
                .accountNumber(request.getAccountNumber())
                .ifscCode(request.getIfscCode())
                .accountHolderName(request.getAccountHolderName())
                .paymentMethod(request.getPaymentMethod())
                .status(PaymentStatus.CREATED)
                .fundsDebited(false)
                .refunded(false)
                .user(user)
                .build();

        paymentRepository.save(payment);
        addHistory(payment, null, PaymentStatus.CREATED, "Payment created", userEmail, TriggerType.USER);

        processPaymentLifecycle(payment, userEmail);

        return toResponse(payment);
    }

    // ──────────────── READ ────────────────

    public PaymentResponse getPayment(Long id) {
        Payment payment = findPaymentOrThrow(id);
        return toResponse(payment);
    }

    public List<PaymentResponse> getAllPayments() {
        return paymentRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<PaymentResponse> getPaymentsByStatus(PaymentStatus status) {
        return paymentRepository.findByStatusOrderByCreatedAtDesc(status).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<PaymentHistoryResponse> getPaymentHistory(Long paymentId) {
        findPaymentOrThrow(paymentId);
        return historyRepository.findByPaymentIdOrderByTimestampAsc(paymentId).stream()
                .map(this::toHistoryResponse)
                .toList();
    }

    // ──────────────── RETRY & ROLLBACK ────────────────

    @Transactional
    public PaymentResponse retryPayment(Long id, String userEmail) {
        Payment payment = findPaymentOrThrow(id);

        if (payment.getStatus() != PaymentStatus.FAILED) {
            throw new BadRequestException(ErrorCode.INVALID_STATUS_TRANSITION,
                    "Only FAILED payments can be retried");
        }

        if (payment.getRetryCount() >= MAX_RETRIES) {
            throw new BadRequestException(ErrorCode.MAX_RETRY_EXCEEDED,
                    "Maximum retry attempts (" + MAX_RETRIES + ") reached");
        }

        payment.setRetryCount(payment.getRetryCount() + 1);
        payment.setFailureCode(null);
        payment.setFailureMessage(null);

        transition(payment, PaymentStatus.CREATED,
                "Retry attempt #" + payment.getRetryCount(), userEmail, TriggerType.RETRY);

        processPaymentLifecycle(payment, userEmail);

        return toResponse(payment);
    }

    /**
     * Manual Rollback Endpoint:
     * When a payment fails, money is debited from sender but NOT credited to receiver.
     * Clicking Rollback adds money BACK ONLY to sender's account!
     */
    @Transactional
    public PaymentResponse rollbackPayment(Long id, String userEmail) {
        Payment payment = findPaymentOrThrow(id);

        if (payment.getStatus() != PaymentStatus.FAILED) {
            throw new BadRequestException(ErrorCode.INVALID_STATUS_TRANSITION,
                    "Only FAILED payments can be rolled back");
        }

        if (payment.isRefunded()) {
            throw new BadRequestException(ErrorCode.INVALID_STATUS_TRANSITION,
                    "Payment funds have already been rolled back/refunded to sender");
        }

        if (!payment.isFundsDebited()) {
            throw new BadRequestException(ErrorCode.INVALID_STATUS_TRANSITION,
                    "No debited funds exist for this payment to roll back");
        }

        User sender = payment.getUser();
        sender.setBankBalance(sender.getBankBalance().add(payment.getAmount()));
        userRepository.save(sender);

        payment.setRefunded(true);
        payment.setFundsDebited(false);
        paymentRepository.save(payment);

        addHistory(payment, PaymentStatus.FAILED, PaymentStatus.FAILED,
                "Rollback initiated by user: " + userEmail, userEmail, TriggerType.USER);
        addHistory(payment, PaymentStatus.FAILED, PaymentStatus.FAILED,
                "Refunded INR " + payment.getAmount() + " back to sender bank account balance", userEmail, TriggerType.SYSTEM);
        addHistory(payment, PaymentStatus.FAILED, PaymentStatus.FAILED,
                "Rollback completed successfully (Receiver balance unchanged)", userEmail, TriggerType.SYSTEM);

        log.info("Successfully rolled back payment #{} for sender {}. Sender balance restored to INR {}", id, userEmail, sender.getBankBalance());

        return toResponse(payment);
    }

    // ──────────────── LIFECYCLE ────────────────

    /**
     * Simulates: CREATED → VALIDATED → SENT → COMPLETED or FAILED
     */
    @Transactional
    protected void processPaymentLifecycle(Payment payment, String userEmail) {
        // Step 1: CREATED → VALIDATED
        transition(payment, PaymentStatus.VALIDATED,
            "Payment validated", userEmail, TriggerType.SYSTEM);

        // Step 2: VALIDATED → SENT
        transition(payment, PaymentStatus.SENT,
            "Payment sent to destination system", userEmail, TriggerType.SYSTEM);

        // Step 3: Exactly 1 in 3 payments fails (every 3rd payment)
        boolean success = (PAYMENT_COUNTER.incrementAndGet() % 3 != 0);

        if (success) {
            if (!payment.isFundsDebited()) {
                if (!hasSufficientBalance(payment.getUser(), payment.getAmount())) {
                    payment.setFailureCode(ErrorCode.INSUFFICIENT_FUNDS.name());
                    payment.setFailureMessage("Insufficient balance in user bank account");
                    transition(payment, PaymentStatus.FAILED,
                        "Payment failed due to insufficient funds", userEmail, TriggerType.SYSTEM);
                    return;
                }
                deductFromUserBalance(payment.getUser(), payment.getAmount());
                payment.setFundsDebited(true);
            }

            // Payment succeeded: Credit destination receiving account
            receivingAccountService.creditBalance(payment.getAmount());
            transition(payment, PaymentStatus.COMPLETED,
                "Payment processed successfully — Funds delivered to receiver", userEmail, TriggerType.SYSTEM);
        } else {
            // Payment failed: Deduct from sender, DO NOT credit receiver!
            if (!payment.isFundsDebited()) {
                if (hasSufficientBalance(payment.getUser(), payment.getAmount())) {
                    deductFromUserBalance(payment.getUser(), payment.getAmount());
                    payment.setFundsDebited(true);
                    addHistory(payment, PaymentStatus.SENT, PaymentStatus.SENT,
                        "Debited INR " + payment.getAmount() + " from sender account before processing failure", userEmail, TriggerType.SYSTEM);
                }
            }

            payment.setFailureCode(ErrorCode.PROCESSING_ERROR.name());
            payment.setFailureMessage("Simulated processing failure — Funds debited from sender, NOT added to receiver balance. Manual Rollback available.");
            payment.setRefunded(false);
            transition(payment, PaymentStatus.FAILED,
                "Simulated processing failure — Sender debited, receiver untouched. Click Rollback to refund sender.", userEmail, TriggerType.SYSTEM);
        }
    }

    // ──────────────── VALIDATION ────────────────

    private void validatePayment(CreatePaymentRequest request) {
        if (request.getAmount().signum() <= 0) {
            throw new BadRequestException(ErrorCode.INVALID_AMOUNT,
                "Payment amount must be positive");
        }

        if (!SUPPORTED_CURRENCIES.contains(request.getCurrency().toUpperCase())) {
            throw new BadRequestException(ErrorCode.INVALID_CURRENCY,
                "Unsupported currency: " + request.getCurrency()
                    + ". Supported: " + SUPPORTED_CURRENCIES);
        }

        if (request.getSenderAccount() != null && request.getSenderAccount().equalsIgnoreCase(request.getReceiverAccount())) {
            throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                "Sender and receiver accounts must be different");
        }

        validatePaymentMethod(request);
    }

    private void applyReceivingAccount(CreatePaymentRequest request, User user) {
        var receivingAccount = receivingAccountService.getReceivingAccount();
        if (request.getPaymentMethod() == PaymentMethod.UPI) {
            String receiverUpi = receivingAccount.getUpiId();
            request.setReceiverAccount(receiverUpi);

            String defaultSenderUpi = user.getEmail() != null && user.getEmail().contains("@")
                    ? user.getEmail().split("@")[0] + "@payflow"
                    : "user@payflow";

            if (isBlank(request.getSenderAccount()) || request.getSenderAccount().equalsIgnoreCase(receiverUpi)) {
                request.setSenderAccount(defaultSenderUpi);
            }
        } else {
            request.setReceiverAccount(receivingAccount.getAccountNumber());
            if (isBlank(request.getSenderAccount()) && request.getPaymentMethod() != PaymentMethod.CARD) {
                request.setSenderAccount(user.getBankAccountNumber());
            }
        }
    }

    private void validatePaymentMethod(CreatePaymentRequest request) {
        switch (request.getPaymentMethod()) {
            case CARD -> {
                if (isBlank(request.getSenderAccount()) || request.getSenderAccount().length() < 10) {
                    throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                            "Card number must be at least 10 digits");
                }
                if (isBlank(request.getCardHolderName())) {
                    throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                            "Card holder name is required for card payments");
                }
                if (isBlank(request.getCardExpiry())
                        || !request.getCardExpiry().matches("^(0[1-9]|1[0-2])/\\d{2}$")) {
                    throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                            "Card expiry must be in MM/YY format");
                }
                if (isBlank(request.getCardCvv()) || !request.getCardCvv().matches("^\\d{3,4}$")) {
                    throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                            "CVV must be 3 or 4 digits");
                }
            }
            case BANK_TRANSFER -> {
                if (isBlank(request.getSenderAccount()) || request.getSenderAccount().length() < 3) {
                    throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                            "Sender bank account number is required");
                }
                if (isBlank(request.getAccountNumber())) {
                    throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                            "Destination account number is required for bank transfer");
                }
                if (isBlank(request.getIfscCode())
                        || !request.getIfscCode().toUpperCase().matches("^[A-Z]{4}0[A-Z0-9]{6}$")) {
                    throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                            "IFSC code is invalid (example: HDFC0123456)");
                }
                if (isBlank(request.getAccountHolderName())) {
                    throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                            "Account holder name is required for bank transfer");
                }
            }
            case UPI -> {
                if (isBlank(request.getReceiverAccount()) || !request.getReceiverAccount().contains("@")) {
                    throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                            "Receiver UPI ID must contain '@' (e.g., receiver@upi)");
                }
                if (isBlank(request.getSenderAccount()) || !request.getSenderAccount().contains("@")) {
                    throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                            "Sender UPI ID must contain '@' (e.g., user@payflow)");
                }
            }
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String maskIfCardNumber(CreatePaymentRequest request) {
        String senderAccount = request.getSenderAccount();
        if (request.getPaymentMethod() != PaymentMethod.CARD) {
            return senderAccount;
        }
        if (senderAccount == null || senderAccount.length() < 4) {
            return senderAccount;
        }
        String last4 = senderAccount.substring(senderAccount.length() - 4);
        return "**** **** **** " + last4;
    }

    private boolean hasSufficientBalance(User user, BigDecimal amount) {
        return user.getBankBalance().compareTo(amount) >= 0;
    }

    private void deductFromUserBalance(User user, BigDecimal amount) {
        user.setBankBalance(user.getBankBalance().subtract(amount));
        userRepository.save(user);
    }

    private void ensureBankProfile(User user) {
        boolean updated = false;
        if (user.getBankBalance() == null) {
            user.setBankBalance(INITIAL_BALANCE);
            updated = true;
        }
        if (user.getBankAccountNumber() == null || user.getBankAccountNumber().isBlank()) {
            user.setBankAccountNumber("FP" + user.getId());
            updated = true;
        }
        if (updated) {
            userRepository.save(user);
        }
    }

    // ──────────────── HELPERS ────────────────

    private Payment findPaymentOrThrow(Long id) {
        return paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.PAYMENT_NOT_FOUND,
                        "Payment not found with id: " + id));
    }

    private void transition(Payment payment, PaymentStatus newStatus,
                            String reason, String triggeredBy, TriggerType triggerType) {
        PaymentStatus oldStatus = payment.getStatus();
        validateTransition(oldStatus, newStatus);
        payment.setStatus(newStatus);
        addHistory(payment, oldStatus, newStatus, reason, triggeredBy, triggerType);
        paymentRepository.save(payment);
    }

    private void validateTransition(PaymentStatus oldStatus, PaymentStatus newStatus) {
        Set<PaymentStatus> allowed = VALID_TRANSITIONS.getOrDefault(oldStatus, Set.of());
        if (!allowed.contains(newStatus)) {
            throw new BadRequestException(ErrorCode.INVALID_STATUS_TRANSITION,
                    "Invalid status transition: " + oldStatus + " -> " + newStatus);
        }
    }

    private void addHistory(Payment payment, PaymentStatus oldStatus,
                            PaymentStatus newStatus, String reason,
                            String triggeredBy, TriggerType triggerType) {
        PaymentHistory history = PaymentHistory.builder()
                .payment(payment)
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .reason(reason)
                .triggeredBy(triggeredBy)
                .triggerType(triggerType)
                .build();
        historyRepository.save(history);
    }

    private PaymentResponse toResponse(Payment p) {
        return PaymentResponse.builder()
                .id(p.getId())
                .idempotencyKey(p.getIdempotencyKey())
                .amount(p.getAmount())
                .currency(p.getCurrency())
                .senderAccount(p.getSenderAccount())
                .receiverAccount(p.getReceiverAccount())
                .purpose(p.getPurpose())
                .cardHolderName(p.getCardHolderName())
                .cardExpiry(p.getCardExpiry())
                .accountNumber(p.getAccountNumber())
                .ifscCode(p.getIfscCode())
                .accountHolderName(p.getAccountHolderName())
                .paymentMethod(p.getPaymentMethod())
                .status(p.getStatus())
                .failureCode(p.getFailureCode())
                .failureMessage(p.getFailureMessage())
                .userBankAccountNumber(p.getUser().getBankAccountNumber())
                .userBankBalance(p.getUser().getBankBalance())
                .retryCount(p.getRetryCount())
                .fundsDebited(p.isFundsDebited())
                .refunded(p.isRefunded())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }

    private PaymentHistoryResponse toHistoryResponse(PaymentHistory h) {
        return PaymentHistoryResponse.builder()
                .id(h.getId())
                .oldStatus(h.getOldStatus())
                .newStatus(h.getNewStatus())
                .reason(h.getReason())
                .triggeredBy(h.getTriggeredBy())
                .triggerType(h.getTriggerType())
                .timestamp(h.getTimestamp())
                .build();
    }
}
