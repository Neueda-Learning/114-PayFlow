package com.payflow.controller;

import com.payflow.dto.ApiResponse;
import com.payflow.dto.ReceivingAccountRequest;
import com.payflow.dto.ReceivingAccountResponse;
import com.payflow.service.ReceivingAccountService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/receiving-account")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Receiving Account", description = "The single account (account number + UPI ID) that receives money for all outgoing payments")
public class ReceivingAccountController {

    private final ReceivingAccountService receivingAccountService;

    @GetMapping
    @Operation(summary = "Get the current receiving account")
    public ResponseEntity<ApiResponse<ReceivingAccountResponse>> getReceivingAccount() {
        return ResponseEntity.ok(
                ApiResponse.ok("Receiving account retrieved", receivingAccountService.getReceivingAccount()));
    }

    @PutMapping
    @Operation(summary = "Create or update the receiving account")
    public ResponseEntity<ApiResponse<ReceivingAccountResponse>> saveReceivingAccount(
            @Valid @RequestBody ReceivingAccountRequest request) {
        return ResponseEntity.ok(
                ApiResponse.ok("Receiving account saved", receivingAccountService.saveReceivingAccount(request)));
    }
}
