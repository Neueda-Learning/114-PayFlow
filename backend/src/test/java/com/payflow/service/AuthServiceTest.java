package com.payflow.service;

import com.payflow.dto.*;
import com.payflow.exception.DuplicateResourceException;
import com.payflow.exception.BadRequestException;
import com.payflow.model.Role;
import com.payflow.model.User;
import com.payflow.repository.UserRepository;
import com.payflow.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.*;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;
    @Mock private AuthenticationManager authenticationManager;

    @InjectMocks private AuthService authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest();
        registerRequest.setFullName("Test User");
        registerRequest.setEmail("test@example.com");
        registerRequest.setPassword("password123");

        loginRequest = new LoginRequest();
        loginRequest.setEmail("test@example.com");
        loginRequest.setPassword("password123");
    }

    @Test
    @DisplayName("should register new user successfully")
    void shouldRegisterUser() {
        when(userRepository.count()).thenReturn(0L);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(1L);
            return u;
        });
        when(jwtUtil.generateToken(anyString(), anyString())).thenReturn("jwt-token");

        AuthResponse response = authService.register(registerRequest);

        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getEmail()).isEqualTo("test@example.com");
        assertThat(response.getBankAccountNumber()).startsWith("FP");
        assertThat(response.getBankBalance()).isEqualByComparingTo(new BigDecimal("100000.00"));
        verify(userRepository, atLeastOnce()).save(any(User.class));
    }

    @Test
    @DisplayName("should reject duplicate email on register")
    void shouldRejectDuplicateEmail() {
        when(userRepository.count()).thenReturn(0L);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(registerRequest))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessageContaining("already registered");
    }

    @Test
    @DisplayName("should reject second account registration in single-user mode")
    void shouldRejectSecondAccountRegistration() {
        when(userRepository.count()).thenReturn(1L);
        when(userRepository.existsByEmail("test@example.com")).thenReturn(false);

        assertThatThrownBy(() -> authService.register(registerRequest))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Single-user mode");
    }

    @Test
    @DisplayName("should login existing user successfully")
    void shouldLoginUser() {
        User user = User.builder()
                .id(1L)
                .email("test@example.com")
                .fullName("Test User")
                .password("hashed")
                .role(Role.USER)
            .bankAccountNumber("FP123456789012")
            .bankBalance(new BigDecimal("99999.00"))
                .build();

        when(authenticationManager.authenticate(any())).thenReturn(null);
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(jwtUtil.generateToken(anyString(), anyString())).thenReturn("jwt-token");

        AuthResponse response = authService.login(loginRequest);

        assertThat(response.getToken()).isEqualTo("jwt-token");
        assertThat(response.getRole()).isEqualTo("USER");
        assertThat(response.getBankAccountNumber()).isEqualTo("FP123456789012");
        assertThat(response.getBankBalance()).isEqualByComparingTo(new BigDecimal("99999.00"));
    }

    @Test
    @DisplayName("should throw on bad credentials")
    void shouldThrowOnBadCredentials() {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("bad creds"));

        assertThatThrownBy(() -> authService.login(loginRequest))
                .isInstanceOf(BadCredentialsException.class);
    }
}
