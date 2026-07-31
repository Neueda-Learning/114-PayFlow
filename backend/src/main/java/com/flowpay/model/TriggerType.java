package com.flowpay.model;

/**
 * Identifies what type of actor triggered a status transition.
 */
public enum TriggerType {
    USER,
    SYSTEM,
    RETRY
}