package com.payflow.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReceivingAccountRequest {

    @NotBlank(message = "Account number is required")
    private String accountNumber;

    @NotBlank(message = "UPI ID is required")
    private String upiId;
}
