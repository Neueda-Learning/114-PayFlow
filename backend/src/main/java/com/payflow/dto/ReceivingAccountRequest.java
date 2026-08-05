package com.payflow.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReceivingAccountRequest {

    private Long id;

    @NotBlank(message = "Account number is required")
    private String accountNumber;

    @NotBlank(message = "UPI ID is required")
    private String upiId;

    @NotBlank(message = "Receiver account holder name is required")
    private String accountHolderName;

    private String ifscCode;
}
