package com.flowpay.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        String secret = "test-secret-key-that-is-at-least-256-bits-long-for-hs256-algorithm";
        jwtUtil = new JwtUtil(secret, 86400000L);
    }

    @Test
    @DisplayName("should generate and validate token")
    void shouldGenerateAndValidateToken() {
        String token = jwtUtil.generateToken("test@example.com", "USER");

        assertThat(jwtUtil.validateToken(token)).isTrue();
        assertThat(jwtUtil.getEmailFromToken(token)).isEqualTo("test@example.com");
        assertThat(jwtUtil.getRoleFromToken(token)).isEqualTo("USER");
    }

    @Test
    @DisplayName("should reject invalid token")
    void shouldRejectInvalidToken() {
        assertThat(jwtUtil.validateToken("invalid-token")).isFalse();
    }

    @Test
    @DisplayName("should reject null token")
    void shouldRejectNullToken() {
        assertThat(jwtUtil.validateToken(null)).isFalse();
    }
}
