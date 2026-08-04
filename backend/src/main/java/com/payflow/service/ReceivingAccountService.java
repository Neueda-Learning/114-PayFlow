package com.payflow.service;

import com.payflow.dto.ReceivingAccountRequest;
import com.payflow.dto.ReceivingAccountResponse;
import com.payflow.exception.ErrorCode;
import com.payflow.exception.ResourceNotFoundException;
import com.payflow.model.ReceivingAccount;
import com.payflow.repository.ReceivingAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Manages the single account (account number + UPI ID) that receives money
 * whenever any user sends a payment. Stored as a singleton row (id = 1).
 */
@Service
@RequiredArgsConstructor
public class ReceivingAccountService {

    private static final Long SINGLETON_ID = 1L;

    private final ReceivingAccountRepository receivingAccountRepository;

    public ReceivingAccountResponse getReceivingAccount() {
        return toResponse(findSingletonOrThrow());
    }

    @Transactional
    public ReceivingAccountResponse saveReceivingAccount(ReceivingAccountRequest request) {
        ReceivingAccount account = receivingAccountRepository.findById(SINGLETON_ID)
                .orElseGet(() -> ReceivingAccount.builder().id(SINGLETON_ID).build());
        account.setAccountNumber(request.getAccountNumber());
        account.setUpiId(request.getUpiId());
        receivingAccountRepository.save(account);
        return toResponse(account);
    }

    /** Used internally by PaymentService — throws if no receiving account has been configured yet. */
    ReceivingAccount findSingletonOrThrow() {
        return receivingAccountRepository.findById(SINGLETON_ID)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.RECEIVING_ACCOUNT_NOT_CONFIGURED,
                        "No receiving account has been configured yet"));
    }

    /**
     * Credits the receiving account's balance by the given amount. Called
     * whenever a payment completes successfully, since the receiving account
     * is the destination of every payment sent from PayFlow.
     */
    @Transactional
    public void creditBalance(BigDecimal amount) {
        ReceivingAccount account = findSingletonOrThrow();
        account.setBalance(account.getBalance().add(amount));
        receivingAccountRepository.save(account);
    }

    private ReceivingAccountResponse toResponse(ReceivingAccount account) {
        return ReceivingAccountResponse.builder()
                .accountNumber(account.getAccountNumber())
                .upiId(account.getUpiId())
                .balance(account.getBalance())
                .updatedAt(account.getUpdatedAt())
                .build();
    }
}
