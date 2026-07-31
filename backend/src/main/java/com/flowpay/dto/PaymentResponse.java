package com.flowpay.dto;

import com.flowpay.model.PaymentMethod;
import com.flowpay.model.PaymentStatus;
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
    private PaymentMethod paymentMethod;
    private PaymentStatus status;
    private String failureCode;
    private String failureMessage;
    private int retryCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
