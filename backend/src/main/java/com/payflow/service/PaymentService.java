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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Core payment business logic — validation, processing, retry, and audit trail.
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
        private static final Map<PaymentStatus, Set<PaymentStatus>> VALID_TRANSITIONS = Map.of(
            PaymentStatus.CREATED, Set.of(PaymentStatus.VALIDATED, PaymentStatus.FAILED),
            PaymentStatus.VALIDATED, Set.of(PaymentStatus.SENT, PaymentStatus.FAILED),
            PaymentStatus.SENT, Set.of(PaymentStatus.COMPLETED, PaymentStatus.FAILED),
            PaymentStatus.FAILED, Set.of(),
            PaymentStatus.COMPLETED, Set.of()
        );
    // Counts processed transactions so every 3rd one is simulated as a failure.
    private final AtomicLong transactionCounter = new AtomicLong(0);

    // ──────────────── CREATE ────────────────

    @Transactional
    public PaymentResponse createPayment(CreatePaymentRequest request, String userEmail) {
        // Duplicate detection via idempotency key
        if (paymentRepository.existsByIdempotencyKey(request.getIdempotencyKey())) {
            Payment existing = paymentRepository.findByIdempotencyKey(request.getIdempotencyKey())
                    .orElseThrow();
            return toResponse(existing);
        }

        // The receiver is always the configured receiving account, never a
        // value supplied by the client — this prevents payments being
        // redirected to an arbitrary account.
        applyReceivingAccount(request);

        // Validate business rules
        validatePayment(request);

        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new ResourceNotFoundException(
                ErrorCode.USER_NOT_FOUND,
                "User not found"));
        ensureBankProfile(user);

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
                .user(user)
                .build();

        paymentRepository.save(payment);
            addHistory(payment, null, PaymentStatus.CREATED, "Payment created", userEmail, TriggerType.USER);

        // Run through validation → processing → completion
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

    /**
     * Flexible search across status, amount range, and date range. Any
     * combination of filters may be omitted (null) to broaden the search.
     */
    public List<PaymentResponse> searchPayments(PaymentStatus status, BigDecimal minAmount,
                                                 BigDecimal maxAmount, LocalDateTime from,
                                                 LocalDateTime to) {
        if (minAmount != null && maxAmount != null && minAmount.compareTo(maxAmount) > 0) {
            throw new BadRequestException(ErrorCode.INVALID_AMOUNT,
                    "minAmount cannot be greater than maxAmount");
        }
        if (from != null && to != null && from.isAfter(to)) {
            throw new BadRequestException(ErrorCode.VALIDATION_FAILED,
                    "'from' date cannot be after 'to' date");
        }
        return paymentRepository.search(status, minAmount, maxAmount, from, to).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<PaymentHistoryResponse> getPaymentHistory(Long paymentId) {
        // Verify payment exists
        findPaymentOrThrow(paymentId);
        return historyRepository.findByPaymentIdOrderByTimestampAsc(paymentId).stream()
                .map(this::toHistoryResponse)
                .toList();
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
        // Funds are reserved (debited) upfront, before the send attempt, so that
        // if the transaction fails below, the exact amount can be rolled back
        // (credited back) to the sender's account.
        if (!hasSufficientBalance(payment.getUser(), payment.getAmount())) {
            payment.setFailureCode(ErrorCode.INSUFFICIENT_FUNDS.name());
            payment.setFailureMessage("Insufficient balance in user bank account");
            transition(payment, PaymentStatus.FAILED,
                "Payment failed due to insufficient funds", userEmail, TriggerType.SYSTEM);
            return;
        }

        deductFromUserBalance(payment.getUser(), payment.getAmount());
        addHistory(payment, payment.getStatus(), payment.getStatus(),
            "Debited " + payment.getCurrency() + " " + payment.getAmount()
                + " from sender account (reserved pending completion)",
            userEmail, TriggerType.SYSTEM);
        transition(payment, PaymentStatus.SENT,
            "Payment sent to destination system", userEmail, TriggerType.SYSTEM);

        // Step 3: Simulate finalization — every 3rd transaction fails
        boolean success = transactionCounter.incrementAndGet() % 3 != 0;

        if (success) {
            receivingAccountService.creditBalance(payment.getAmount());
            transition(payment, PaymentStatus.COMPLETED,
                "Payment processed successfully", userEmail, TriggerType.SYSTEM);
        } else {
            // Rollback: refund the reserved amount back to the sender's account
            refundToUserBalance(payment.getUser(), payment.getAmount());
            addHistory(payment, payment.getStatus(), payment.getStatus(),
                "Refunded " + payment.getCurrency() + " " + payment.getAmount()
                    + " back to sender account after processing failure",
                userEmail, TriggerType.SYSTEM);
            payment.setFailureCode(ErrorCode.PROCESSING_ERROR.name());
            payment.setFailureMessage("Simulated processing failure — amount refunded to your account");
            transition(payment, PaymentStatus.FAILED,
                "Simulated processing failure — amount refunded", userEmail, TriggerType.SYSTEM);
        }
    }

    // ──────────────── VALIDATION ────────────────

    private void validatePayment(CreatePaymentRequest request) {
        // Positive amount — already handled by @DecimalMin, but double-check
        if (request.getAmount().signum() <= 0) {
            throw new BadRequestException(ErrorCode.INVALID_AMOUNT,
                "Payment amount must be positive");
        }

        // Supported currency
        if (!SUPPORTED_CURRENCIES.contains(request.getCurrency().toUpperCase())) {
            throw new BadRequestException(ErrorCode.INVALID_CURRENCY,
                "Unsupported currency: " + request.getCurrency()
                    + ". Supported: " + SUPPORTED_CURRENCIES);
        }

        // Sender ≠ Receiver
        if (request.getSenderAccount().equalsIgnoreCase(request.getReceiverAccount())) {
            throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                "Sender and receiver accounts must be different");
        }

        // Basic payment method validation
        validatePaymentMethod(request);
    }

    /** Overwrites the request's receiver account with the configured receiving account. */
    private void applyReceivingAccount(CreatePaymentRequest request) {
        var receivingAccount = receivingAccountService.getReceivingAccount();
        request.setReceiverAccount(request.getPaymentMethod() == PaymentMethod.UPI
                ? receivingAccount.getUpiId()
                : receivingAccount.getAccountNumber());
    }

    private void validatePaymentMethod(CreatePaymentRequest request) {
        switch (request.getPaymentMethod()) {
            case CARD -> {
                // Card number-like sender expected
                if (request.getSenderAccount().length() < 10) {
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
                if (isBlank(request.getCardCvv()) || !request.getCardCvv().matches("^\\d{3}$")) {
                    throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                            "CVV must be exactly 3 digits");
                }
            }
            case BANK_TRANSFER -> {
                // Both accounts should look like account numbers
                if (request.getSenderAccount().length() < 6
                        || request.getReceiverAccount().length() < 6) {
                    throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                            "Bank account numbers must be at least 6 characters");
                }
                if (isBlank(request.getAccountNumber())) {
                    throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                            "Account number is required for bank transfer");
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
                // UPI IDs should contain @
                if (!request.getSenderAccount().contains("@")
                        || !request.getReceiverAccount().contains("@")) {
                    throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                            "UPI IDs must contain '@' (e.g., user@upi)");
                }
            }
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    /**
     * CVV is validated but never persisted (PCI-DSS: must not be stored after
     * authorization). Card numbers are masked to only the last 4 digits before
     * being saved, since the full PAN is not needed after validation.
     */
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

    /** Reverses a prior debit — used to roll back funds when a payment fails after being reserved. */
    private void refundToUserBalance(User user, BigDecimal amount) {
        user.setBankBalance(user.getBankBalance().add(amount));
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
