package com.payflow.controller;

import com.payflow.dto.*;
import com.payflow.model.PaymentStatus;
import com.payflow.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Payments", description = "Payment CRUD, processing, retry, and rollback endpoints")
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping
    @Operation(summary = "Create a new payment")
    public ResponseEntity<ApiResponse<PaymentResponse>> createPayment(
            @Valid @RequestBody CreatePaymentRequest request,
            Authentication auth) {
        PaymentResponse response = paymentService.createPayment(request, auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Payment created", response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get payment by ID")
    public ResponseEntity<ApiResponse<PaymentResponse>> getPayment(@PathVariable Long id) {
        return ResponseEntity.ok(
                ApiResponse.ok("Payment retrieved", paymentService.getPayment(id)));
    }

    @GetMapping
    @Operation(summary = "Get all payments")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getAllPayments() {
        return ResponseEntity.ok(
                ApiResponse.ok("Payments retrieved", paymentService.getAllPayments()));
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Search payments by status")
    public ResponseEntity<ApiResponse<List<PaymentResponse>>> getByStatus(
            @PathVariable PaymentStatus status) {
        return ResponseEntity.ok(
                ApiResponse.ok("Payments retrieved", paymentService.getPaymentsByStatus(status)));
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Get payment audit history")
    public ResponseEntity<ApiResponse<List<PaymentHistoryResponse>>> getHistory(
            @PathVariable Long id) {
        return ResponseEntity.ok(
                ApiResponse.ok("Payment history retrieved", paymentService.getPaymentHistory(id)));
    }

    @PostMapping("/{id}/retry")
    @Operation(summary = "Retry a failed payment (max 3 attempts)")
    public ResponseEntity<ApiResponse<PaymentResponse>> retryPayment(
            @PathVariable Long id,
            Authentication auth) {
        return ResponseEntity.ok(
                ApiResponse.ok("Payment retry initiated", paymentService.retryPayment(id, auth.getName())));
    }

    @PostMapping("/{id}/rollback")
    @Operation(summary = "Manually rollback debited funds for a failed payment")
    public ResponseEntity<ApiResponse<PaymentResponse>> rollbackPayment(
            @PathVariable Long id,
            Authentication auth) {
        return ResponseEntity.ok(
                ApiResponse.ok("Payment rollback completed successfully", paymentService.rollbackPayment(id, auth.getName())));
    }
}
