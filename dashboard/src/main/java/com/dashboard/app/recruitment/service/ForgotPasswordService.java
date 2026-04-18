package com.dashboard.app.recruitment.service;

import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.recruitment.dto.request.ForgotPasswordChangeRequest;
import com.dashboard.app.recruitment.dto.request.ForgotPasswordRequestOtpRequest;
import com.dashboard.app.recruitment.dto.request.ForgotPasswordVerifyOtpRequest;
import com.dashboard.app.recruitment.model.Candidate;
import com.dashboard.app.recruitment.model.ForgotPasswordOtp;
import com.dashboard.app.recruitment.model.RecruitmentUser;
import com.dashboard.app.recruitment.repository.CandidateRepository;
import com.dashboard.app.recruitment.repository.ForgotPasswordOtpRepository;
import com.dashboard.app.recruitment.repository.RecruitmentUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Optional;

/**
 * Forgot-password flow: request OTP, verify OTP, change password.
 * Role-agnostic: works for Admin, Recruiter, Technical Interviewer, and Candidate.
 * OTP expiry, resend throttling (30s), password hashing, and no user enumeration.
 */
@Service
public class ForgotPasswordService {

    private static final Logger logger = LoggerFactory.getLogger(ForgotPasswordService.class);
    private static final int OTP_LENGTH = 6;
    private static final int OTP_VALIDITY_SECONDS = 600;   // 10 minutes
    private static final int RESEND_THROTTLE_SECONDS = 30;
    private static final String OTP_SUCCESS_MESSAGE =
            "If this email is registered, you will receive an OTP shortly. Please check your inbox and spam folder.";

    @Value("${app.forgot-password.otp-validity-minutes:10}")
    private int otpValidityMinutes;

    @Autowired
    private ForgotPasswordOtpRepository forgotPasswordOtpRepository;
    @Autowired
    private RecruitmentUserRepository recruitmentUserRepository;
    @Autowired
    private CandidateRepository candidateRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private RecruitmentEmailService recruitmentEmailService;

    private static final SecureRandom RANDOM = new SecureRandom();

    /**
     * Request OTP for forgot password. Sends email only if email is registered.
     * Always returns same success message to avoid user enumeration.
     * Resend throttle: 30 seconds.
     */
    @Transactional
    public String requestOtp(ForgotPasswordRequestOtpRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        
        // Validate mobile number if provided - must be exactly 10 digits
        if (request.getMobileNumber() != null && !request.getMobileNumber().trim().isEmpty()) {
            String mobileNumber = request.getMobileNumber().trim().replaceAll("[^0-9]", "");
            if (mobileNumber.length() != 10) {
                throw new BadRequestException("Mobile number must be exactly 10 digits.");
            }
        }
        
        Optional<RecruitmentUser> ru = recruitmentUserRepository.findByEmail(email);
        Optional<Candidate> cand = ru.isEmpty() ? candidateRepository.findByEmail(email) : Optional.empty();

        if (ru.isEmpty() && cand.isEmpty()) {
            logger.info("Forgot-password OTP requested for unregistered email (no OTP sent): {}", maskEmail(email));
            return OTP_SUCCESS_MESSAGE;
        }

        Optional<ForgotPasswordOtp> existing = forgotPasswordOtpRepository.findByEmail(email);
        Instant now = Instant.now();

        if (existing.isPresent()) {
            ForgotPasswordOtp row = existing.get();
            long secSinceLast = now.getEpochSecond() - row.getLastOtpSentAt().getEpochSecond();
            if (secSinceLast < RESEND_THROTTLE_SECONDS) {
                throw new BadRequestException(
                        "Please wait " + (RESEND_THROTTLE_SECONDS - (int) secSinceLast) + " seconds before requesting a new OTP.");
            }
        }

        String otp = generateOtp();
        String otpHash = passwordEncoder.encode(otp);
        Instant expiresAt = now.plusSeconds(OTP_VALIDITY_SECONDS);

        ForgotPasswordOtp entity = existing.orElse(new ForgotPasswordOtp());
        entity.setEmail(email);
        entity.setOtpHash(otpHash);
        entity.setExpiresAt(expiresAt);
        entity.setLastOtpSentAt(now);
        forgotPasswordOtpRepository.save(entity);

        try {
            recruitmentEmailService.sendForgotPasswordOtp(email, otp, otpValidityMinutes);
            logger.info("Forgot-password OTP sent to registered email: {}", maskEmail(email));
        } catch (Exception e) {
            logger.error("Failed to send forgot-password OTP email: {}", maskEmail(email), e);
            throw new BadRequestException("Unable to send OTP. Please try again later.");
        }

        return OTP_SUCCESS_MESSAGE;
    }

    /**
     * Verify OTP. Returns success message if valid; throws otherwise.
     */
    @Transactional(readOnly = true)
    public String verifyOtp(ForgotPasswordVerifyOtpRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String otp = request.getOtp().trim();

        ForgotPasswordOtp row = forgotPasswordOtpRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Invalid or expired OTP. Please request a new one."));

        if (Instant.now().isAfter(row.getExpiresAt())) {
            logger.info("Forgot-password OTP expired for: {}", maskEmail(email));
            throw new BadRequestException("OTP has expired. Please request a new one.");
        }

        if (!passwordEncoder.matches(otp, row.getOtpHash())) {
            logger.warn("Invalid forgot-password OTP attempt for: {}", maskEmail(email));
            throw new BadRequestException("Invalid OTP. Please check and try again.");
        }

        return "OTP verified successfully.";
    }

    /**
     * Change password after OTP verification. Validates OTP again, then updates password.
     */
    @Transactional
    public String changePassword(ForgotPasswordChangeRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        String otp = request.getOtp().trim();
        String newPassword = request.getNewPassword();
        String confirmPassword = request.getConfirmPassword();

        if (!newPassword.equals(confirmPassword)) {
            throw new BadRequestException("New password and confirm password do not match.");
        }

        ForgotPasswordOtp row = forgotPasswordOtpRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Invalid or expired OTP. Please request a new one."));

        if (Instant.now().isAfter(row.getExpiresAt())) {
            throw new BadRequestException("OTP has expired. Please request a new one.");
        }

        if (!passwordEncoder.matches(otp, row.getOtpHash())) {
            throw new BadRequestException("Invalid OTP. Please check and try again.");
        }

        Optional<RecruitmentUser> ru = recruitmentUserRepository.findByEmail(email);
        if (ru.isPresent()) {
            RecruitmentUser u = ru.get();
            u.setPassword(passwordEncoder.encode(newPassword));
            recruitmentUserRepository.save(u);
            logger.info("Password updated via forgot-password for recruitment user: {}", maskEmail(email));
        } else {
            Candidate c = candidateRepository.findByEmail(email)
                    .orElseThrow(() -> new BadRequestException("Invalid or expired OTP. Please request a new one."));
            c.setPassword(passwordEncoder.encode(newPassword));
            candidateRepository.save(c);
            logger.info("Password updated via forgot-password for candidate: {}", maskEmail(email));
        }

        forgotPasswordOtpRepository.delete(row);
        return "Password updated successfully. You can now sign in with your new password.";
    }

    private String generateOtp() {
        StringBuilder sb = new StringBuilder(OTP_LENGTH);
        for (int i = 0; i < OTP_LENGTH; i++) {
            sb.append(RANDOM.nextInt(10));
        }
        return sb.toString();
    }

    private String maskEmail(String email) {
        if (email == null || email.length() < 5) return "***";
        int at = email.indexOf('@');
        if (at <= 2) return "***@" + (at < email.length() - 1 ? email.substring(at + 1) : "***");
        return email.substring(0, 2) + "***@" + (at < email.length() - 1 ? email.substring(at + 1) : "***");
    }
}
