package com.payflow.service;

import com.payflow.dto.CreatePaymentRequest;
import com.payflow.dto.PaymentResponse;
import com.payflow.dto.ReceivingAccountResponse;
import com.payflow.exception.BadRequestException;
import com.payflow.exception.DuplicateResourceException;
import com.payflow.exception.ResourceNotFoundException;
import com.payflow.model.*;
import com.payflow.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentHistoryRepository historyRepository;
    @Mock private UserRepository userRepository;
    @Mock private ReceivingAccountService receivingAccountService;

    @InjectMocks private PaymentService paymentService;

    private User testUser;
    private CreatePaymentRequest validRequest;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .email("test@example.com")
                .fullName("Test User")
                .role(Role.USER)
            .bankAccountNumber("FP123456789012")
            .bankBalance(new BigDecimal("100000.00"))
                .createdAt(LocalDateTime.now())
                .build();

        validRequest = new CreatePaymentRequest();
        validRequest.setAmount(new BigDecimal("100.00"));
        validRequest.setCurrency("INR");
        validRequest.setSenderAccount("1234567890");
        validRequest.setReceiverAccount("0987654321");
        validRequest.setPurpose("Monthly rent payment");
        validRequest.setPaymentMethod(PaymentMethod.CARD);
        validRequest.setCardHolderName("Test User");
        validRequest.setCardExpiry("08/30");
        validRequest.setCardCvv("123");
        validRequest.setIdempotencyKey("test-key-001");

        lenient().when(receivingAccountService.getReceivingAccount()).thenReturn(
                ReceivingAccountResponse.builder()
                        .accountNumber("0987654321")
                        .upiId("receiver@upi")
                        .build());
    }

    // ──────── Create Payment Tests ────────

    @Nested
    @DisplayName("Create Payment")
    class CreatePaymentTests {

        @Test
        @DisplayName("should create payment with valid data")
        void shouldCreatePayment() {
            when(paymentRepository.existsByIdempotencyKey(anyString())).thenReturn(false);
            when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(testUser));
            when(paymentRepository.save(any(Payment.class))).thenAnswer(invocation -> {
                Payment p = invocation.getArgument(0);
                p.setId(1L);
                p.setCreatedAt(LocalDateTime.now());
                p.setUpdatedAt(LocalDateTime.now());
                return p;
            });
            when(historyRepository.save(any(PaymentHistory.class))).thenReturn(null);

            PaymentResponse response = paymentService.createPayment(validRequest, "test@example.com");

            assertThat(response).isNotNull();
            assertThat(response.getAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
            assertThat(response.getCurrency()).isEqualTo("INR");
            assertThat(response.getPurpose()).isEqualTo("Monthly rent payment");
            assertThat(response.getStatus()).isIn(PaymentStatus.COMPLETED, PaymentStatus.FAILED);
            verify(paymentRepository, atLeastOnce()).save(any(Payment.class));
        }

        @Test
        @DisplayName("should return existing payment for duplicate idempotency key")
        void shouldReturnExistingForDuplicateKey() {
            Payment existing = Payment.builder()
                    .id(1L)
                    .idempotencyKey("test-key-001")
                    .amount(new BigDecimal("100.00"))
                    .currency("INR")
                    .senderAccount("1234567890")
                    .receiverAccount("0987654321")
                    .purpose("Monthly rent payment")
                    .paymentMethod(PaymentMethod.CARD)
                    .status(PaymentStatus.COMPLETED)
                    .user(testUser)
                    .createdAt(LocalDateTime.now())
                    .build();

            when(paymentRepository.existsByIdempotencyKey("test-key-001")).thenReturn(true);
            when(paymentRepository.findByIdempotencyKey("test-key-001"))
                    .thenReturn(Optional.of(existing));

            PaymentResponse response = paymentService.createPayment(validRequest, "test@example.com");

            assertThat(response.getId()).isEqualTo(1L);
            verify(paymentRepository, never()).save(any(Payment.class));
        }
    }

    // ──────── Validation Tests ────────

    @Nested
    @DisplayName("Payment Validation")
    class ValidationTests {

        @Test
        @DisplayName("should reject unsupported currency")
        void shouldRejectUnsupportedCurrency() {
            validRequest.setCurrency("XYZ");
            when(paymentRepository.existsByIdempotencyKey(anyString())).thenReturn(false);

            assertThatThrownBy(() ->
                    paymentService.createPayment(validRequest, "test@example.com"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Unsupported currency");
        }

        @Test
        @DisplayName("should reject same sender and receiver")
        void shouldRejectSameSenderReceiver() {
            // The receiver is always the configured receiving account, so this
            // triggers the same-account rejection when the sender matches it.
            validRequest.setSenderAccount("0987654321");
            when(paymentRepository.existsByIdempotencyKey(anyString())).thenReturn(false);

            assertThatThrownBy(() ->
                    paymentService.createPayment(validRequest, "test@example.com"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("different");
        }

        @Test
        @DisplayName("should reject UPI without @ symbol")
        void shouldRejectInvalidUpi() {
            validRequest.setPaymentMethod(PaymentMethod.UPI);
            validRequest.setSenderAccount("invalidupi");
            when(paymentRepository.existsByIdempotencyKey(anyString())).thenReturn(false);

            assertThatThrownBy(() ->
                    paymentService.createPayment(validRequest, "test@example.com"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("@");
        }

        @Test
        @DisplayName("should reject short card number")
        void shouldRejectShortCardNumber() {
            validRequest.setPaymentMethod(PaymentMethod.CARD);
            validRequest.setSenderAccount("123");
            when(paymentRepository.existsByIdempotencyKey(anyString())).thenReturn(false);

            assertThatThrownBy(() ->
                    paymentService.createPayment(validRequest, "test@example.com"))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Card number");
        }
    }

    // ──────── Read Tests ────────

    @Nested
    @DisplayName("Read Payments")
    class ReadTests {

        @Test
        @DisplayName("should throw when payment not found")
        void shouldThrowWhenNotFound() {
            when(paymentRepository.findById(99L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> paymentService.getPayment(99L))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("should return all payments")
        void shouldReturnAllPayments() {
            when(paymentRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of());

            List<PaymentResponse> result = paymentService.getAllPayments();
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should filter payments by status")
        void shouldFilterByStatus() {
            when(paymentRepository.findByStatusOrderByCreatedAtDesc(PaymentStatus.COMPLETED))
                    .thenReturn(List.of());

            List<PaymentResponse> result =
                    paymentService.getPaymentsByStatus(PaymentStatus.COMPLETED);
            assertThat(result).isEmpty();
            verify(paymentRepository).findByStatusOrderByCreatedAtDesc(PaymentStatus.COMPLETED);
        }
    }
}
