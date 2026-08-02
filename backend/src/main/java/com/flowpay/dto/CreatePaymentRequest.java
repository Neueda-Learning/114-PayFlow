package com.flowpay.dto;

import com.flowpay.model.PaymentMethod;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreatePaymentRequest {

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be positive")
    private BigDecimal amount;

    @NotBlank(message = "Currency is required")
    @Size(min = 3, max = 3, message = "Currency must be a 3-letter code (INR)")
    private String currency;

    @NotBlank(message = "Sender account is required")
    private String senderAccount;

    // Ignored if provided by the client; the server always overwrites this
    // with the configured receiving account (see ReceivingAccountService).
    private String receiverAccount;

    @NotNull(message = "Payment method is required")
    private PaymentMethod paymentMethod;

    @NotBlank(message = "Idempotency key is required")
    private String idempotencyKey;

    @NotBlank(message = "Purpose is required")
    @Size(max = 300, message = "Purpose must be at most 300 characters")
    private String purpose;

    // Card fields
    private String cardHolderName;
    private String cardExpiry;
    private String cardCvv;

    // Bank transfer fields
    private String accountNumber;
    private String ifscCode;
    private String accountHolderName;
}
