package com.dashboard.app.recruitment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * Stores OTP for forgot-password flow. One active record per email.
 * OTP is stored hashed. Resend throttling via lastOtpSentAt.
 */
@Entity
@Table(name = "forgot_password_otp", indexes = { @Index(name = "idx_fp_otp_email", columnList = "email") })
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ForgotPasswordOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(name = "otp_hash", nullable = false, length = 255)
    private String otpHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "last_otp_sent_at", nullable = false)
    private Instant lastOtpSentAt;

    @CreationTimestamp
    @Column(name = "created_at")
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
