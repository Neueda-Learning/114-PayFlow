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

import java.util.List;

@RestController
@RequestMapping("/api/receiving-account")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Receiving Accounts", description = "Endpoints to retrieve and manage receiver destination accounts")
public class ReceivingAccountController {

    private final ReceivingAccountService receivingAccountService;

    @GetMapping
    @Operation(summary = "Get all configured receiving accounts")
    public ResponseEntity<ApiResponse<List<ReceivingAccountResponse>>> getAllReceivingAccounts() {
        return ResponseEntity.ok(
                ApiResponse.ok("Receiving accounts retrieved", receivingAccountService.getAllReceivingAccounts()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get receiving account by ID")
    public ResponseEntity<ApiResponse<ReceivingAccountResponse>> getReceivingAccountById(@PathVariable Long id) {
        return ResponseEntity.ok(
                ApiResponse.ok("Receiving account retrieved", receivingAccountService.getReceivingAccountById(id)));
    }

    @PostMapping
    @Operation(summary = "Create or update a receiving account")
    public ResponseEntity<ApiResponse<ReceivingAccountResponse>> saveReceivingAccount(
            @Valid @RequestBody ReceivingAccountRequest request) {
        return ResponseEntity.ok(
                ApiResponse.ok("Receiving account saved", receivingAccountService.saveReceivingAccount(request)));
    }

    @PutMapping
    @Operation(summary = "Create or update a receiving account")
    public ResponseEntity<ApiResponse<ReceivingAccountResponse>> updateReceivingAccount(
            @Valid @RequestBody ReceivingAccountRequest request) {
        return ResponseEntity.ok(
                ApiResponse.ok("Receiving account saved", receivingAccountService.saveReceivingAccount(request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete receiving account by ID")
    public ResponseEntity<ApiResponse<Void>> deleteReceivingAccount(@PathVariable Long id) {
        receivingAccountService.deleteReceivingAccount(id);
        return ResponseEntity.ok(ApiResponse.ok("Receiving account deleted", null));
    }
}
