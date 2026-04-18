package com.dashboard.app.recruitment.controller;

import com.dashboard.app.dto.request.LoginRequest;
import com.dashboard.app.dto.response.AuthResponse;
import com.dashboard.app.recruitment.dto.request.ForgotPasswordChangeRequest;
import com.dashboard.app.recruitment.dto.request.ForgotPasswordRequestOtpRequest;
import com.dashboard.app.recruitment.dto.request.ForgotPasswordVerifyOtpRequest;
import com.dashboard.app.recruitment.dto.request.RegisterCandidateRequest;
import com.dashboard.app.recruitment.dto.response.CandidateResponse;
import com.dashboard.app.recruitment.service.CandidateService;
import com.dashboard.app.recruitment.service.ForgotPasswordService;
import com.dashboard.app.recruitment.service.RecruitmentAuthService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/recruitment/auth")
@CrossOrigin(origins = "*")
public class RecruitmentAuthController {

    @Autowired
    private RecruitmentAuthService recruitmentAuthService;

    @Autowired
    private CandidateService candidateService;

    @Autowired
    private ForgotPasswordService forgotPasswordService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = recruitmentAuthService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> registerCandidate(@Valid @RequestBody RegisterCandidateRequest request) {
        candidateService.initiateRegistration(request);
        return ResponseEntity.ok(Map.of("message", "OTP sent to your email"));
    }

    @PostMapping("/verify-registration")
    public ResponseEntity<CandidateResponse> verifyRegistration(@Valid @RequestBody com.dashboard.app.recruitment.dto.request.VerifyRegistrationRequest request) {
        CandidateResponse response = candidateService.verifyRegistration(request.getEmail(), request.getOtp());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/resend-registration-otp")
    public ResponseEntity<Map<String, String>> resendRegistrationOtp(@Valid @RequestBody com.dashboard.app.recruitment.dto.request.ResendRegistrationOtpRequest request) {
        candidateService.resendRegistrationOtp(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "OTP resent successfully"));
    }

    @PostMapping("/forgot-password/request-otp")
    public ResponseEntity<Map<String, String>> requestForgotPasswordOtp(
            @Valid @RequestBody ForgotPasswordRequestOtpRequest request) {
        String message = forgotPasswordService.requestOtp(request);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @PostMapping("/forgot-password/verify-otp")
    public ResponseEntity<Map<String, String>> verifyForgotPasswordOtp(
            @Valid @RequestBody ForgotPasswordVerifyOtpRequest request) {
        String message = forgotPasswordService.verifyOtp(request);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @PostMapping("/forgot-password/change-password")
    public ResponseEntity<Map<String, String>> changePasswordForgotPassword(
            @Valid @RequestBody ForgotPasswordChangeRequest request) {
        String message = forgotPasswordService.changePassword(request);
        return ResponseEntity.ok(Map.of("message", message));
    }
    @PostMapping("/verify-email")
    public ResponseEntity<Map<String, String>> verifyEmail(@RequestParam String token) {
        candidateService.verifyEmail(token);
        return ResponseEntity.ok(Map.of("message", "Email verified successfully"));
    }
}

