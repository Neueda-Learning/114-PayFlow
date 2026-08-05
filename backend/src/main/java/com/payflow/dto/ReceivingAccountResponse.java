package com.payflow.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class ReceivingAccountResponse {

    private Long id;
    private String accountNumber;
    private String upiId;
    private String accountHolderName;
    private String ifscCode;
    private BigDecimal balance;
    private LocalDateTime updatedAt;
}
