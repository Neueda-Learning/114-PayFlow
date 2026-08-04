package com.payflow.repository;

import com.payflow.model.ReceivingAccount;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReceivingAccountRepository extends JpaRepository<ReceivingAccount, Long> {
}
