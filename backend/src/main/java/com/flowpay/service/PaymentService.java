package com.flowpay.service;

import com.flowpay.dto.*;
import com.flowpay.exception.*;
import com.flowpay.model.*;
import com.flowpay.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

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

    private static final Set<String> SUPPORTED_CURRENCIES = Set.of("INR");
    private static final int MAX_RETRIES = 3;
        private static final Map<PaymentStatus, Set<PaymentStatus>> VALID_TRANSITIONS = Map.of(
            PaymentStatus.CREATED, Set.of(PaymentStatus.VALIDATED, PaymentStatus.FAILED),
            PaymentStatus.VALIDATED, Set.of(PaymentStatus.SENT, PaymentStatus.FAILED),
            PaymentStatus.SENT, Set.of(PaymentStatus.COMPLETED, PaymentStatus.FAILED),
            PaymentStatus.FAILED, Set.of(PaymentStatus.CREATED),
            PaymentStatus.COMPLETED, Set.of()
        );
    private final Random random = new Random();

    // ──────────────── CREATE ────────────────

    @Transactional
    public PaymentResponse createPayment(CreatePaymentRequest request, String userEmail) {
        // Duplicate detection via idempotency key
        if (paymentRepository.existsByIdempotencyKey(request.getIdempotencyKey())) {
            Payment existing = paymentRepository.findByIdempotencyKey(request.getIdempotencyKey())
                    .orElseThrow();
            return toResponse(existing);
        }

        // Validate business rules
        validatePayment(request);

        User user = userRepository.findByEmail(userEmail)
            .orElseThrow(() -> new ResourceNotFoundException(
                ErrorCode.USER_NOT_FOUND,
                "User not found"));

        Payment payment = Payment.builder()
                .idempotencyKey(request.getIdempotencyKey())
                .amount(request.getAmount())
                .currency(request.getCurrency().toUpperCase())
                .senderAccount(request.getSenderAccount())
                .receiverAccount(request.getReceiverAccount())
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
        return paymentRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<PaymentResponse> getPaymentsByStatus(PaymentStatus status) {
        return paymentRepository.findByStatus(status).stream()
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

    // ──────────────── RETRY ────────────────

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

        // Re-process from CREATED
        transition(payment, PaymentStatus.CREATED,
                "Retry attempt #" + payment.getRetryCount(), userEmail, TriggerType.RETRY);

        processPaymentLifecycle(payment, userEmail);

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

        // Step 3: Simulate finalization (70% success rate)
        boolean success = random.nextInt(100) < 70;

        if (success) {
            transition(payment, PaymentStatus.COMPLETED,
                "Payment processed successfully", userEmail, TriggerType.SYSTEM);
        } else {
            payment.setFailureCode(ErrorCode.PROCESSING_ERROR.name());
            payment.setFailureMessage("Simulated processing failure");
            transition(payment, PaymentStatus.FAILED,
                "Simulated processing failure", userEmail, TriggerType.SYSTEM);
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

    private void validatePaymentMethod(CreatePaymentRequest request) {
        switch (request.getPaymentMethod()) {
            case CARD -> {
                // Card number-like sender expected
                if (request.getSenderAccount().length() < 10) {
                    throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                            "Card number must be at least 10 digits");
                }
            }
            case BANK_TRANSFER -> {
                // Both accounts should look like account numbers
                if (request.getSenderAccount().length() < 6
                        || request.getReceiverAccount().length() < 6) {
                    throw new BadRequestException(ErrorCode.INVALID_ACCOUNT,
                            "Bank account numbers must be at least 6 characters");
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
                .paymentMethod(p.getPaymentMethod())
                .status(p.getStatus())
                .failureCode(p.getFailureCode())
                .failureMessage(p.getFailureMessage())
                .retryCount(p.getRetryCount())
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
