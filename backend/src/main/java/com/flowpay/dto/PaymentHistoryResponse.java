package com.flowpay.dto;

import com.flowpay.model.PaymentStatus;
import com.flowpay.model.TriggerType;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PaymentHistoryResponse {

    private Long id;
    private PaymentStatus oldStatus;
    private PaymentStatus newStatus;
    private String reason;
    private String triggeredBy;
    private TriggerType triggerType;
    private LocalDateTime timestamp;
}
