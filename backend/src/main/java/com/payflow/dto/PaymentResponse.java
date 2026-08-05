package com.payflow.dto;

import com.payflow.model.PaymentMethod;
import com.payflow.model.PaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class PaymentResponse {

    private Long id;
    private String idempotencyKey;
    private BigDecimal amount;
    private String currency;
    private String senderAccount;
    private String receiverAccount;
    private String purpose;
    private String cardHolderName;
    private String cardExpiry;
    private String accountNumber;
    private String ifscCode;
    private String accountHolderName;
    private PaymentMethod paymentMethod;
    private PaymentStatus status;
    private String failureCode;
    private String failureMessage;
    private String userBankAccountNumber;
    private BigDecimal userBankBalance;
    private int retryCount;
    private boolean fundsDebited;
    private boolean refunded;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
