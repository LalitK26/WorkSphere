package com.dashboard.app.recruitment.service;

import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.enums.UserStatus;
import com.dashboard.app.recruitment.dto.request.RegisterCandidateRequest;
import com.dashboard.app.recruitment.dto.response.CandidateResponse;
import com.dashboard.app.recruitment.model.Candidate;
import com.dashboard.app.recruitment.model.RecruitmentRole;
import com.dashboard.app.recruitment.model.enums.RecruitmentRoleType;
import com.dashboard.app.recruitment.repository.CandidateRepository;
import com.dashboard.app.recruitment.repository.RecruitmentRoleRepository;
import com.dashboard.app.recruitment.repository.CandidateProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
@Transactional
public class CandidateService {

    private static final Logger logger = LoggerFactory.getLogger(CandidateService.class);

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private RecruitmentRoleRepository recruitmentRoleRepository;

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RecruitmentEmailService recruitmentEmailService;

    @Autowired
    private com.dashboard.app.recruitment.repository.PendingCandidateRepository pendingCandidateRepository;

    /**
     * Stage 1: Initiate registration - Validate, Store in Pending, Send OTP
     */
    public void initiateRegistration(RegisterCandidateRequest request) {
        // 1. Validate email uniqueness in main table
        if (candidateRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already exists");
        }

        // 2. Handle Pending Candidate Data
        com.dashboard.app.recruitment.model.PendingCandidate pending = pendingCandidateRepository.findByEmail(request.getEmail())
                .orElse(new com.dashboard.app.recruitment.model.PendingCandidate());

        pending.setEmail(request.getEmail());
        // Always update details in case they changed fixed typos
        pending.setPassword(passwordEncoder.encode(request.getPassword()));
        pending.setFirstName(request.getFirstName());
        pending.setLastName(request.getLastName());
        pending.setPhoneNumber(request.getPhoneNumber());
        
        // 3. Generate & Hash OTP
        String otp = generateOtp();
        pending.setOtp(passwordEncoder.encode(otp)); // Hash the OTP
        pending.setOtpExpiry(LocalDateTime.now().plusMinutes(10)); // 10 mins expiry
        
        // Increment attempts if updating? Or reset?
        // Let's reset attempts on new initiation to avoid lockout from previous sessions
        pending.setAttempts(0);

        pendingCandidateRepository.save(pending);

        // 4. Send OTP Email
        String name = (request.getFirstName() + " " + request.getLastName()).trim();
        recruitmentEmailService.sendSignupOtp(request.getEmail(), name, otp);
        
        logger.info("Registration initiated for email: {}", request.getEmail());
    }

    /**
     * Stage 2: Verify OTP and Create Account
     */
    public CandidateResponse verifyRegistration(String email, String otp) {
        com.dashboard.app.recruitment.model.PendingCandidate pending = pendingCandidateRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("No pending registration found for this email"));

        // Check Expiry
        if (pending.getOtpExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("OTP has expired. Please resend.");
        }

        // Verify OTP
        if (!passwordEncoder.matches(otp, pending.getOtp())) {
            pending.setAttempts(pending.getAttempts() + 1);
            pendingCandidateRepository.save(pending);
            throw new BadRequestException("Invalid OTP");
        }

        // Check if email already exists (double check race condition)
        if (candidateRepository.existsByEmail(email)) {
            pendingCandidateRepository.delete(pending);
            throw new BadRequestException("Account already exists");
        }

        // Create actual Candidate
        Candidate candidate = new Candidate();
        candidate.setEmail(pending.getEmail());
        candidate.setPassword(pending.getPassword()); // Already hashed
        candidate.setFirstName(pending.getFirstName());
        candidate.setLastName(pending.getLastName());
        candidate.setPhoneNumber(pending.getPhoneNumber());
        candidate.setStatus(UserStatus.ACTIVE);
        candidate.setEmailVerified(true);
        candidate.setVerificationToken(null);
        candidate.setTokenExpiryDate(null);

         // Find CANDIDATE role
        RecruitmentRole role = recruitmentRoleRepository.findByType(RecruitmentRoleType.CANDIDATE)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("CANDIDATE role not found"));
        
        candidate.setRole(role);

        Candidate savedCandidate = candidateRepository.save(candidate);

        // Cleanup pending
        pendingCandidateRepository.delete(pending);

        // Send Welcome Email
        String name = (candidate.getFirstName() + " " + candidate.getLastName()).trim();
        recruitmentEmailService.sendAccountCreationVerification(candidate.getEmail(), name, false); // Profile not completed yet

        return mapToResponse(savedCandidate);
    }

    public void resendRegistrationOtp(String email) {
        com.dashboard.app.recruitment.model.PendingCandidate pending = pendingCandidateRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("No pending registration found"));
        
        // Rate limit? (Optional but good)
        
        String otp = generateOtp();
        pending.setOtp(passwordEncoder.encode(otp));
        pending.setOtpExpiry(LocalDateTime.now().plusMinutes(10));
        pendingCandidateRepository.save(pending);

        String name = (pending.getFirstName() + " " + pending.getLastName()).trim();
        recruitmentEmailService.sendSignupOtp(pending.getEmail(), name, otp);
    }

    private String generateOtp() {
        // Generate 6 digit random number
        java.util.Random rnd = new java.util.Random();
        int number = rnd.nextInt(999999);
        return String.format("%06d", number);
    }

    // Deprecated or removed original registerCandidate. 
    // Keeping a stub or removing it depending on Controller usage.
    // The controller calls registerCandidate. I should probably rename initiateRegistration to registerCandidate 
    // OR update Controller. User asked to "Update the signup flow".
    // I will keep registerCandidate but change signature? No, Interface changes break things.
    // Better to have new methods and update controller.
    
    // I am REPLACING the verifyEmail method content as well since we don't use links anymore
    public void verifyEmail(String token) {
       // Legacy link support or remove? 
       // User said "No localhost URLs anywhere... OTP-based verification"
       // I'll leave it throwing exception or just deprecated.
       throw new BadRequestException("Link verification is disabled. Please use OTP.");
    }
    private CandidateResponse mapToResponse(Candidate candidate) {
        CandidateResponse response = new CandidateResponse();
        response.setId(candidate.getId());
        response.setEmail(candidate.getEmail());
        response.setFirstName(candidate.getFirstName());
        response.setLastName(candidate.getLastName());
        response.setFullName(candidate.getFullName());
        response.setPhoneNumber(candidate.getPhoneNumber());
        response.setStatus(candidate.getStatus().name());
        response.setCreatedAt(candidate.getCreatedAt());
        response.setUpdatedAt(candidate.getUpdatedAt());
        
        if (candidate.getRole() != null) {
            response.setRoleId(candidate.getRole().getId());
            response.setRoleName(candidate.getRole().getName());
            response.setRoleType(candidate.getRole().getType() != null ? candidate.getRole().getType().name() : null);
        }
        
        return response;
    }
}


