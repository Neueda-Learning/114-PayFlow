package com.flowpay.model;

/**
 * Payment lifecycle statuses.
 * CREATED → VALIDATED → SENT → COMPLETED or FAILED
 */
public enum PaymentStatus {
    CREATED,
    VALIDATED,
    SENT,
    COMPLETED,
    FAILED
}
