package com.payflow.service;

import com.payflow.dto.*;
import com.payflow.exception.BadRequestException;
import com.payflow.exception.DuplicateResourceException;
import com.payflow.exception.ErrorCode;
import com.payflow.model.Role;
import com.payflow.model.User;
import com.payflow.repository.UserRepository;
import com.payflow.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Handles user registration and login.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

        private static final BigDecimal INITIAL_BALANCE = new BigDecimal("100000.00");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.count() > 0) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new DuplicateResourceException(ErrorCode.DUPLICATE_RESOURCE,
                        "Email already registered");
            }
            throw new BadRequestException(ErrorCode.SINGLE_USER_MODE,
                    "Single-user mode is enabled. Registration is closed after the first account.");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException(ErrorCode.DUPLICATE_RESOURCE,
                    "Email already registered");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.USER)
                .bankAccountNumber(generateBankAccountNumber())
                .bankBalance(INITIAL_BALANCE)
                .build();

        userRepository.save(user);
        ensureBankProfile(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());

        return AuthResponse.builder()
                .token(token)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .bankAccountNumber(user.getBankAccountNumber())
                .bankBalance(user.getBankBalance())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(), request.getPassword()));

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException(ErrorCode.VALIDATION_FAILED,
                        "User not found"));
        ensureBankProfile(user);

        String token = jwtUtil.generateToken(user.getEmail(), user.getRole().name());

        return AuthResponse.builder()
                .token(token)
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                                .bankAccountNumber(user.getBankAccountNumber())
                                .bankBalance(user.getBankBalance())
                .build();
    }

        private String generateBankAccountNumber() {
                long suffix = ThreadLocalRandom.current().nextLong(100000000000L, 1000000000000L);
                return "FP" + suffix;
        }

        private void ensureBankProfile(User user) {
                boolean updated = false;
                if (user.getBankAccountNumber() == null || user.getBankAccountNumber().isBlank()) {
                        user.setBankAccountNumber(generateBankAccountNumber());
                        updated = true;
                }
                if (user.getBankBalance() == null) {
                        user.setBankBalance(INITIAL_BALANCE);
                        updated = true;
                }
                if (updated) {
                        userRepository.save(user);
                }
        }
}
