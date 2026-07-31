package com.flowpay.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class ReceivingAccountResponse {

    private String accountNumber;
    private String upiId;
    private BigDecimal balance;
    private LocalDateTime updatedAt;
}
