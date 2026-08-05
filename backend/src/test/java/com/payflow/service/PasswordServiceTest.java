package com.payflow.service;

import com.payflow.dto.ChangePasswordRequest;
import com.payflow.exception.BadRequestException;
import com.payflow.model.Role;
import com.payflow.model.User;
import com.payflow.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private PasswordService passwordService;

    private ChangePasswordRequest request;

    @BeforeEach
    void setUp() {
        request = new ChangePasswordRequest();
        request.setCurrentPassword("oldPassword123");
        request.setNewPassword("newPassword123");
        request.setConfirmPassword("newPassword123");
    }

    @Test
    @DisplayName("should change password successfully")
    void shouldChangePasswordSuccessfully() {
        User user = User.builder()
                .id(1L)
                .email("test@example.com")
                .password("encoded-old")
                .role(Role.USER)
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPassword123", "encoded-old")).thenReturn(true);
        when(passwordEncoder.encode("newPassword123")).thenReturn("encoded-new");

        passwordService.changePassword("test@example.com", request);

        assertThat(user.getPassword()).isEqualTo("encoded-new");
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("should reject when current password is incorrect")
    void shouldRejectWhenCurrentPasswordIncorrect() {
        User user = User.builder()
                .id(1L)
                .email("test@example.com")
                .password("encoded-old")
                .role(Role.USER)
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPassword123", "encoded-old")).thenReturn(false);

        assertThatThrownBy(() -> passwordService.changePassword("test@example.com", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Current password is incorrect");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("should reject when confirmation does not match")
    void shouldRejectWhenConfirmationDoesNotMatch() {
        User user = User.builder()
                .id(1L)
                .email("test@example.com")
                .password("encoded-old")
                .role(Role.USER)
                .build();

        request.setConfirmPassword("differentPassword");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPassword123", "encoded-old")).thenReturn(true);

        assertThatThrownBy(() -> passwordService.changePassword("test@example.com", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("do not match");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("should reject when new password is same as current")
    void shouldRejectWhenNewPasswordSameAsCurrent() {
        User user = User.builder()
                .id(1L)
                .email("test@example.com")
                .password("encoded-old")
                .role(Role.USER)
                .build();

        request.setNewPassword("oldPassword123");
        request.setConfirmPassword("oldPassword123");

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("oldPassword123", "encoded-old")).thenReturn(true);

        assertThatThrownBy(() -> passwordService.changePassword("test@example.com", request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("must be different");

        verify(userRepository, never()).save(any(User.class));
    }
}
