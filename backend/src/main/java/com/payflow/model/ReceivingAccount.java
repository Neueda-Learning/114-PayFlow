package com.payflow.model;

import com.payflow.security.EncryptedStringConverter;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Singleton entity holding the single account (account number + UPI ID) that
 * receives money whenever any user sends a payment. Configured via a
 * dedicated settings page rather than typed manually on every payment.
 */
@Entity
@Table(name = "receiving_account")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ReceivingAccount {

    @Id
    private Long id;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(nullable = false)
    private String accountNumber;

    @Column(nullable = false)
    private String upiId;

    @Builder.Default
    @Column(nullable = false)
    private BigDecimal balance = BigDecimal.ZERO;

    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onSave() {
        this.updatedAt = LocalDateTime.now();
    }
}
