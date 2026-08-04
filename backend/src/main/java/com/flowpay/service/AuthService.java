package com.flowpay.service;

import com.flowpay.dto.*;
import com.flowpay.exception.BadRequestException;
import com.flowpay.exception.DuplicateResourceException;
import com.flowpay.exception.ErrorCode;
import com.flowpay.model.Role;
import com.flowpay.model.User;
import com.flowpay.repository.UserRepository;
import com.flowpay.security.JwtUtil;
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

        public void changePassword(String userEmail, ChangePasswordRequest request) {
                User user = userRepository.findByEmail(userEmail)
                                .orElseThrow(() -> new BadRequestException(ErrorCode.USER_NOT_FOUND,
                                                "User not found"));

                if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
                        throw new BadRequestException(ErrorCode.VALIDATION_FAILED,
                                        "Current password is incorrect");
                }

                if (!request.getNewPassword().equals(request.getConfirmPassword())) {
                        throw new BadRequestException(ErrorCode.VALIDATION_FAILED,
                                        "New password and confirm password do not match");
                }

                if (request.getCurrentPassword().equals(request.getNewPassword())) {
                        throw new BadRequestException(ErrorCode.VALIDATION_FAILED,
                                        "New password must be different from current password");
                }

                user.setPassword(passwordEncoder.encode(request.getNewPassword()));
                userRepository.save(user);
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
