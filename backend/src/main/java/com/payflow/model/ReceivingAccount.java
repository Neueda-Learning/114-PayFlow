package com.payflow.model;

import com.payflow.security.EncryptedStringConverter;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entity holding configured receiver accounts (destination accounts) for incoming payments.
 */
@Entity
@Table(name = "receiving_accounts")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ReceivingAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(nullable = false)
    private String accountNumber;

    @Column(nullable = false)
    private String upiId;

    @Column(nullable = false)
    private String accountHolderName;

    @Column(nullable = false)
    @Builder.Default
    private String ifscCode = "HDFC0123456";

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
