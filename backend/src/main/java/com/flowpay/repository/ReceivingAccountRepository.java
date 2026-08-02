package com.flowpay.repository;

import com.flowpay.model.ReceivingAccount;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReceivingAccountRepository extends JpaRepository<ReceivingAccount, Long> {
}
