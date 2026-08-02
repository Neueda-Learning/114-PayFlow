package com.flowpay.repository;

import com.flowpay.model.PaymentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PaymentHistoryRepository extends JpaRepository<PaymentHistory, Long> {

    List<PaymentHistory> findByPaymentIdOrderByTimestampAsc(Long paymentId);
}
