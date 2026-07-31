package com.flowpay.model;

import com.flowpay.security.EncryptedStringConverter;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Core Payment entity.
 */
@Entity
@Table(name = "payments")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Idempotency key to prevent duplicate payments */
    @Column(nullable = false, unique = true)
    private String idempotencyKey;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false)
    private String senderAccount;

    @Column(nullable = false)
    private String receiverAccount;

    @Column(nullable = false, length = 300)
    private String purpose;

    // Card fields (used when paymentMethod=CARD)
    private String cardHolderName;
    private String cardExpiry;
    // NOTE: CVV is intentionally never persisted (PCI-DSS: CVV must not be stored
    // after authorization). It is validated in PaymentService and then discarded.

    // Bank transfer fields (used when paymentMethod=BANK_TRANSFER)
    @Convert(converter = EncryptedStringConverter.class)
    private String accountNumber;

    @Convert(converter = EncryptedStringConverter.class)
    private String ifscCode;

    private String accountHolderName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    /** Failure details — null when successful */
    private String failureCode;
    private String failureMessage;

    @Builder.Default
    private int retryCount = 0;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    /** The user who created this payment */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Audit trail — every status change is recorded */
    @OneToMany(mappedBy = "payment", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PaymentHistory> history = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
