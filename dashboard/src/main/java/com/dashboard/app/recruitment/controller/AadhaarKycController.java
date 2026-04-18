package com.dashboard.app.recruitment.controller;

import com.dashboard.app.recruitment.dto.request.AadhaarGenerateOtpRequest;
import com.dashboard.app.recruitment.dto.request.AadhaarSubmitOtpRequest;
import com.dashboard.app.recruitment.dto.response.AadhaarGenerateOtpResponse;
import com.dashboard.app.recruitment.dto.response.AadhaarSubmitOtpResponse;
import com.dashboard.app.recruitment.model.Candidate;
import com.dashboard.app.recruitment.model.CandidateProfile;
import com.dashboard.app.recruitment.repository.CandidateProfileRepository;
import com.dashboard.app.recruitment.repository.CandidateRepository;
import com.dashboard.app.recruitment.service.AadhaarKycService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/recruitment/aadhaar-kyc")
@CrossOrigin(origins = "*")
public class AadhaarKycController {

    private static final Logger logger = LoggerFactory.getLogger(AadhaarKycController.class);

    @Autowired
    private AadhaarKycService aadhaarKycService;

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    /**
     * Generate OTP for Aadhaar verification
     * Candidate only - requires authentication
     */
    @PostMapping("/generate-otp")
    public ResponseEntity<?> generateOtp(@Valid @RequestBody AadhaarGenerateOtpRequest request) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String email = auth.getName();

            // Verify candidate exists
            Optional<Candidate> candidateOpt = candidateRepository.findWithRoleByEmail(email);
            if (candidateOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Candidate not found"));
            }

            // Generate OTP via QuickeKYC
            AadhaarGenerateOtpResponse response = aadhaarKycService.generateOtp(request.getAadhaarNumber());

            logger.info("OTP generated for candidate: {}", email);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error generating OTP: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Submit OTP and verify Aadhaar
     * Candidate only - requires authentication
     * On successful verification, automatically updates candidate profile with Aadhaar data
     */
    @PostMapping("/submit-otp")
    @Transactional
    public ResponseEntity<?> submitOtp(@Valid @RequestBody AadhaarSubmitOtpRequest request) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String email = auth.getName();

            // Verify candidate exists
            Optional<Candidate> candidateOpt = candidateRepository.findWithRoleByEmail(email);
            if (candidateOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Candidate not found"));
            }
            Candidate candidate = candidateOpt.get();

            // Submit OTP and verify Aadhaar
            AadhaarSubmitOtpResponse response = aadhaarKycService.submitOtp(request.getClientId(), request.getOtp());

            if (response.isVerified() && response.getAadhaarData() != null) {
                // Auto-populate candidate profile with Aadhaar data
                updateCandidateWithAadhaarData(candidate, response.getAadhaarData());

                logger.info("Aadhaar verified and profile updated for candidate: {}", email);
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error submitting OTP: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Update candidate and profile with Aadhaar-verified data
     * Marks fields as read-only (Aadhaar-verified)
     */
    private void updateCandidateWithAadhaarData(Candidate candidate, com.dashboard.app.recruitment.dto.response.AadhaarDataResponse aadhaarData) {
        // Update candidate personal information (only if not already set)
        boolean firstNameUpdated = false;
        boolean middleNameUpdated = false;
        boolean lastNameUpdated = false;
        boolean dobUpdated = false;

        if (aadhaarData.getFirstName() != null && (candidate.getFirstName() == null || candidate.getFirstName().trim().isEmpty())) {
            candidate.setFirstName(aadhaarData.getFirstName());
            firstNameUpdated = true;
        }
        if (aadhaarData.getMiddleName() != null && candidate.getMiddleName() == null) {
            candidate.setMiddleName(aadhaarData.getMiddleName());
            middleNameUpdated = true;
        }
        if (aadhaarData.getLastName() != null && (candidate.getLastName() == null || candidate.getLastName().trim().isEmpty())) {
            candidate.setLastName(aadhaarData.getLastName());
            lastNameUpdated = true;
        }

        // Parse and set date of birth
        if (aadhaarData.getDateOfBirth() != null) {
            try {
                LocalDate dob = parseDateOfBirth(aadhaarData.getDateOfBirth());
                if (dob != null && candidate.getDateOfBirth() == null) {
                    candidate.setDateOfBirth(dob);
                    dobUpdated = true;
                }
            } catch (Exception e) {
                logger.warn("Could not parse date of birth: {}", aadhaarData.getDateOfBirth());
            }
        }

        // Mark candidate as Aadhaar-verified
        candidate.setAadhaarVerified(true);
        candidateRepository.save(candidate);

        // Get or create profile
        CandidateProfile profile = candidateProfileRepository.findByCandidateIdWithEducation(candidate.getId())
                .orElse(new CandidateProfile());

        if (profile.getCandidate() == null) {
            profile.setCandidate(candidate);
        }

        // Update address from Aadhaar (only if not already set) and mark as verified
        boolean addressUpdated = false;
        boolean cityUpdated = false;
        boolean stateUpdated = false;
        boolean zipCodeUpdated = false;

        if (aadhaarData.getAddress() != null && (profile.getStreetAddress() == null || profile.getStreetAddress().trim().isEmpty())) {
            profile.setStreetAddress(aadhaarData.getAddress());
            addressUpdated = true;
        }
        if (aadhaarData.getDistrict() != null && (profile.getCity() == null || profile.getCity().trim().isEmpty())) {
            profile.setCity(aadhaarData.getDistrict());
            cityUpdated = true;
        }
        if (aadhaarData.getState() != null && (profile.getState() == null || profile.getState().trim().isEmpty())) {
            profile.setState(aadhaarData.getState());
            stateUpdated = true;
        }
        if (aadhaarData.getPincode() != null && (profile.getZipCode() == null || profile.getZipCode().trim().isEmpty())) {
            profile.setZipCode(aadhaarData.getPincode());
            zipCodeUpdated = true;
        }

        // Mark Aadhaar-verified fields as read-only
        if (firstNameUpdated) {
            profile.setAadhaarVerifiedFirstName(true);
        }
        if (middleNameUpdated) {
            profile.setAadhaarVerifiedMiddleName(true);
        }
        if (lastNameUpdated) {
            profile.setAadhaarVerifiedLastName(true);
        }
        if (dobUpdated) {
            profile.setAadhaarVerifiedDateOfBirth(true);
        }
        if (addressUpdated) {
            profile.setAadhaarVerifiedStreetAddress(true);
        }
        if (cityUpdated) {
            profile.setAadhaarVerifiedCity(true);
        }
        if (stateUpdated) {
            profile.setAadhaarVerifiedState(true);
        }
        if (zipCodeUpdated) {
            profile.setAadhaarVerifiedZipCode(true);
        }

        candidateProfileRepository.save(profile);
    }

    /**
     * Parse date of birth from various formats
     */
    private LocalDate parseDateOfBirth(String dobString) {
        if (dobString == null || dobString.trim().isEmpty()) {
            return null;
        }

        // Try common date formats
        String[] formats = {
                "yyyy-MM-dd",
                "dd-MM-yyyy",
                "dd/MM/yyyy",
                "yyyy/MM/dd",
                "dd-MMM-yyyy"
        };

        for (String format : formats) {
            try {
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern(format);
                return LocalDate.parse(dobString.trim(), formatter);
            } catch (Exception e) {
                // Try next format
            }
        }

        return null;
    }
}

