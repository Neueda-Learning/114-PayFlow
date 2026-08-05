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
import java.util.List;

/**
 * Manages multiple receiver destination accounts.
 */
@Service
@RequiredArgsConstructor
public class ReceivingAccountService {

    private final ReceivingAccountRepository receivingAccountRepository;

    @Transactional
    public List<ReceivingAccountResponse> getAllReceivingAccounts() {
        ensureDefaultAccountsSeeded();
        return receivingAccountRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ReceivingAccountResponse getReceivingAccountById(Long id) {
        ensureDefaultAccountsSeeded();
        ReceivingAccount account = receivingAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.RECEIVING_ACCOUNT_NOT_CONFIGURED,
                        "Receiving account not found with id: " + id));
        return toResponse(account);
    }

    @Transactional
    public ReceivingAccountResponse getPrimaryReceivingAccount() {
        ensureDefaultAccountsSeeded();
        ReceivingAccount account = receivingAccountRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        ErrorCode.RECEIVING_ACCOUNT_NOT_CONFIGURED,
                        "No receiving accounts configured"));
        return toResponse(account);
    }

    @Transactional
    public ReceivingAccountResponse saveReceivingAccount(ReceivingAccountRequest request) {
        ReceivingAccount account;
        if (request.getId() != null) {
            account = receivingAccountRepository.findById(request.getId())
                    .orElseGet(() -> ReceivingAccount.builder().build());
        } else {
            account = ReceivingAccount.builder().build();
        }

        account.setAccountNumber(request.getAccountNumber());
        account.setUpiId(request.getUpiId());
        account.setAccountHolderName(request.getAccountHolderName());
        account.setIfscCode(request.getIfscCode() != null && !request.getIfscCode().isBlank() ? request.getIfscCode().toUpperCase() : "HDFC0123456");

        receivingAccountRepository.save(account);
        return toResponse(account);
    }

    @Transactional
    public void deleteReceivingAccount(Long id) {
        if (receivingAccountRepository.existsById(id)) {
            receivingAccountRepository.deleteById(id);
        }
    }

    /**
     * Credits balance to receiving account by account number or ID.
     */
    @Transactional
    public void creditBalance(BigDecimal amount) {
        ensureDefaultAccountsSeeded();
        ReceivingAccount account = receivingAccountRepository.findAll().stream()
                .findFirst()
                .orElseGet(() -> receivingAccountRepository.save(ReceivingAccount.builder()
                        .accountNumber("998877665544")
                        .upiId("treasury@payflow")
                        .accountHolderName("PayFlow Treasury")
                        .ifscCode("HDFC0123456")
                        .balance(BigDecimal.ZERO)
                        .build()));
        account.setBalance(account.getBalance().add(amount));
        receivingAccountRepository.save(account);
    }

    private void ensureDefaultAccountsSeeded() {
        if (receivingAccountRepository.count() == 0) {
            receivingAccountRepository.save(ReceivingAccount.builder()
                    .accountNumber("998877665544")
                    .upiId("treasury@payflow")
                    .accountHolderName("PayFlow Treasury Primary")
                    .ifscCode("HDFC0123456")
                    .balance(new BigDecimal("2500000.00"))
                    .build());

            receivingAccountRepository.save(ReceivingAccount.builder()
                    .accountNumber("112233445566")
                    .upiId("merchant@icici")
                    .accountHolderName("ICICI Corporate Settlement")
                    .ifscCode("ICIC0001234")
                    .balance(new BigDecimal("1200000.00"))
                    .build());

            receivingAccountRepository.save(ReceivingAccount.builder()
                    .accountNumber("556677889900")
                    .upiId("settlement@hdfc")
                    .accountHolderName("HDFC Operations Receiver")
                    .ifscCode("HDFC0009988")
                    .balance(new BigDecimal("800000.00"))
                    .build());
        }
    }

    public ReceivingAccountResponse getReceivingAccount() {
        return getPrimaryReceivingAccount();
    }

    private ReceivingAccountResponse toResponse(ReceivingAccount account) {
        return ReceivingAccountResponse.builder()
                .id(account.getId())
                .accountNumber(account.getAccountNumber())
                .upiId(account.getUpiId())
                .accountHolderName(account.getAccountHolderName())
                .ifscCode(account.getIfscCode())
                .balance(account.getBalance())
                .updatedAt(account.getUpdatedAt())
                .build();
    }
}
