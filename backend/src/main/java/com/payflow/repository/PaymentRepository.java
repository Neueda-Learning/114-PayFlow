package com.payflow.repository;

import com.payflow.model.Payment;
import com.payflow.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByStatusOrderByCreatedAtDesc(PaymentStatus status);

    List<Payment> findAllByOrderByCreatedAtDesc();

    List<Payment> findByUserIdOrderByCreatedAtDesc(Long userId);

    Optional<Payment> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);

    /**
     * Flexible search — any combination of status, amount range, and date
     * range can be supplied; unspecified (null) filters are ignored.
     */
    @Query("SELECT p FROM Payment p WHERE " +
            "(:status IS NULL OR p.status = :status) AND " +
            "(:minAmount IS NULL OR p.amount >= :minAmount) AND " +
            "(:maxAmount IS NULL OR p.amount <= :maxAmount) AND " +
            "(:from IS NULL OR p.createdAt >= :from) AND " +
            "(:to IS NULL OR p.createdAt <= :to) " +
            "ORDER BY p.createdAt DESC")
    List<Payment> search(@Param("status") PaymentStatus status,
                          @Param("minAmount") BigDecimal minAmount,
                          @Param("maxAmount") BigDecimal maxAmount,
                          @Param("from") LocalDateTime from,
                          @Param("to") LocalDateTime to);
}
