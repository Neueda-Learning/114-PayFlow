package com.payflow.model;

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
