package com.dashboard.app.recruitment.service;

import com.dashboard.app.dto.request.LoginRequest;
import com.dashboard.app.dto.response.AuthResponse;
import com.dashboard.app.exception.UnauthorizedException;
import com.dashboard.app.recruitment.model.Candidate;
import com.dashboard.app.recruitment.model.RecruitmentUser;
import com.dashboard.app.recruitment.repository.CandidateRepository;
import com.dashboard.app.recruitment.repository.RecruitmentUserRepository;
import com.dashboard.app.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class RecruitmentAuthService {

    private static final Logger logger = LoggerFactory.getLogger(RecruitmentAuthService.class);

    @Autowired
    private RecruitmentUserRepository recruitmentUserRepository;

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private com.dashboard.app.recruitment.repository.CandidateProfileRepository candidateProfileRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public AuthResponse login(LoginRequest request) {
        try {
            // Try to find in recruitment users first
            RecruitmentUser recruitmentUser = recruitmentUserRepository.findWithRoleByEmail(request.getEmail()).orElse(null);
        
        if (recruitmentUser != null) {
            // Check password
            if (!passwordEncoder.matches(request.getPassword(), recruitmentUser.getPassword())) {
                logger.error("Authentication failed for recruitment user email: " + request.getEmail());
                throw new UnauthorizedException("Invalid email or password");
            }

            // Check status
            if (recruitmentUser.getStatus() != com.dashboard.app.model.enums.UserStatus.ACTIVE) {
                throw new UnauthorizedException("Account is not active");
            }

            // Check if user has a role
            if (recruitmentUser.getRole() == null) {
                throw new UnauthorizedException("User role not found. Please contact administrator.");
            }

            if (recruitmentUser.getRole().getType() == null) {
                throw new UnauthorizedException("User role type not found. Please contact administrator.");
            }

            // Create UserDetails from loaded user
            UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                    recruitmentUser.getEmail(),
                    recruitmentUser.getPassword(),
                    new java.util.ArrayList<>()
            );

            String token = jwtUtil.generateToken(userDetails, recruitmentUser.getId(), recruitmentUser.getRole().getType().name());

            return new AuthResponse(
                    token,
                    "Bearer",
                    recruitmentUser.getId(),
                    recruitmentUser.getEmail(),
                    recruitmentUser.getRole().getType().name(),
                    recruitmentUser.getFullName(),
                    recruitmentUser.getPhoneNumber(),
                    true // Recruitment users (admins/recruiters) are considered "complete" for dashboard access
            );
        }

        // Try to find in candidates - first try with role
        Candidate candidate = candidateRepository.findWithRoleByEmail(request.getEmail()).orElse(null);
        
        // If not found with role, try finding by email only (in case role join fails due to missing role)
        if (candidate == null) {
            logger.debug("Candidate not found with role join, trying without role for email: " + request.getEmail());
            candidate = candidateRepository.findByEmail(request.getEmail()).orElse(null);
            // If found without role, load the role separately
            if (candidate != null) {
                logger.debug("Found candidate without role, loading role separately for candidate ID: " + candidate.getId());
                candidate = candidateRepository.findWithRoleById(candidate.getId()).orElse(candidate);
                if (candidate.getRole() == null) {
                    logger.error("Candidate found but role is null for candidate ID: " + candidate.getId() + ", role_id from DB might be invalid");
                }
            }
        }
        
        if (candidate != null) {
            // Check password
            if (!passwordEncoder.matches(request.getPassword(), candidate.getPassword())) {
                logger.error("Authentication failed for candidate email: " + request.getEmail());
                throw new UnauthorizedException("Invalid email or password");
            }

            // Check email verification
            if (Boolean.FALSE.equals(candidate.getEmailVerified())) {
                throw new UnauthorizedException("Please verify your email address to login");
            }

            // Check status
            if (candidate.getStatus() != com.dashboard.app.model.enums.UserStatus.ACTIVE) {
                throw new UnauthorizedException("Account is not active");
            }

            // Check if candidate has a role
            if (candidate.getRole() == null) {
                throw new UnauthorizedException("User role not found. Please contact administrator.");
            }

            if (candidate.getRole().getType() == null) {
                throw new UnauthorizedException("User role type not found. Please contact administrator.");
            }

            // Create UserDetails from loaded candidate
            UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                    candidate.getEmail(),
                    candidate.getPassword(),
                    new java.util.ArrayList<>()
            );

            String token = jwtUtil.generateToken(userDetails, candidate.getId(), candidate.getRole().getType().name());

            // Check profile completion status
            boolean isProfileComplete = false;
            java.util.Optional<com.dashboard.app.recruitment.model.CandidateProfile> profileOpt = candidateProfileRepository.findByCandidateIdWithEducation(candidate.getId());
            if (profileOpt.isPresent()) {
                com.dashboard.app.recruitment.model.CandidateProfile profile = profileOpt.get();
                isProfileComplete = profile.isCompleted();
                
                // Also check progress percentage - if 100%, mark as complete even if flag wasn't set
                if (!isProfileComplete) {
                    int progressPercentage = calculateProgressPercentage(profile, candidate);
                    if (progressPercentage >= 100) {
                        // Validate all mandatory fields before marking as complete
                        if (validateMandatoryFields(profile, candidate)) {
                            profile.setCompleted(true);
                            candidateProfileRepository.save(profile);
                            isProfileComplete = true;
                            logger.info("Profile automatically marked as complete during login - progress reached 100%");
                        }
                    }
                }
            }

            return new AuthResponse(
                    token,
                    "Bearer",
                    candidate.getId(),
                    candidate.getEmail(),
                    candidate.getRole().getType().name(),
                    candidate.getFullName(),
                    candidate.getPhoneNumber(),
                    isProfileComplete
            );
        }

        // User not found in either table
        logger.error("User not found with email: " + request.getEmail());
        throw new UnauthorizedException("Invalid email or password");
        } catch (DataAccessException e) {
            logger.error("Database error during login: {}", e.getMessage(), e);
            // Re-throw to let GlobalExceptionHandler handle it
            throw e;
        }
    }
    
    /**
     * Calculates the percentage of mandatory fields completed
     * Mandatory fields: firstName, lastName, phoneNumber, streetAddress, city, state, zipCode, education (at least one valid), resumeUrl
     * Total: 9 mandatory fields
     */
    private int calculateProgressPercentage(com.dashboard.app.recruitment.model.CandidateProfile profile, Candidate candidate) {
        int completedFields = 0;
        int totalMandatoryFields = 9;
        
        // Personal Information (3 fields)
        if (candidate.getFirstName() != null && !candidate.getFirstName().trim().isEmpty()) {
            completedFields++;
        }
        if (candidate.getLastName() != null && !candidate.getLastName().trim().isEmpty()) {
            completedFields++;
        }
        if (candidate.getPhoneNumber() != null && !candidate.getPhoneNumber().trim().isEmpty()) {
            completedFields++;
        }
        
        // Address Information (4 fields)
        if (profile.getStreetAddress() != null && !profile.getStreetAddress().trim().isEmpty()) {
            completedFields++;
        }
        if (profile.getCity() != null && !profile.getCity().trim().isEmpty()) {
            completedFields++;
        }
        if (profile.getState() != null && !profile.getState().trim().isEmpty()) {
            completedFields++;
        }
        if (profile.getZipCode() != null && !profile.getZipCode().trim().isEmpty()) {
            completedFields++;
        }
        
        // Education (1 field - at least one valid education entry)
        if (profile.getEducation() != null && !profile.getEducation().isEmpty()) {
            boolean hasValidEducation = false;
            for (com.dashboard.app.recruitment.model.CandidateEducation edu : profile.getEducation()) {
                if (isValidEducation(edu)) {
                    hasValidEducation = true;
                    break;
                }
            }
            if (hasValidEducation) {
                completedFields++;
            }
        }
        
        // Documents (1 field - resume URL)
        if (profile.getResumeUrl() != null && !profile.getResumeUrl().trim().isEmpty()) {
            completedFields++;
        }
        
        // Calculate percentage (rounded to nearest integer)
        return (int) Math.round((completedFields * 100.0) / totalMandatoryFields);
    }
    
    /**
     * Validates that all mandatory fields are filled
     */
    private boolean validateMandatoryFields(com.dashboard.app.recruitment.model.CandidateProfile profile, Candidate candidate) {
        // Validate personal information (mandatory fields)
        if (candidate.getFirstName() == null || candidate.getFirstName().trim().isEmpty()) {
            return false;
        }
        if (candidate.getLastName() == null || candidate.getLastName().trim().isEmpty()) {
            return false;
        }
        if (candidate.getPhoneNumber() == null || candidate.getPhoneNumber().trim().isEmpty()) {
            return false;
        }
        
        // Validate address information (mandatory fields)
        if (profile.getStreetAddress() == null || profile.getStreetAddress().trim().isEmpty()) {
            return false;
        }
        if (profile.getCity() == null || profile.getCity().trim().isEmpty()) {
            return false;
        }
        if (profile.getState() == null || profile.getState().trim().isEmpty()) {
            return false;
        }
        if (profile.getZipCode() == null || profile.getZipCode().trim().isEmpty()) {
            return false;
        }
        
        // Validate education - at least one education entry with all required fields
        if (profile.getEducation() == null || profile.getEducation().isEmpty()) {
            return false;
        }
        // Check that at least one education entry is valid
        boolean hasValidEducation = false;
        for (com.dashboard.app.recruitment.model.CandidateEducation edu : profile.getEducation()) {
            if (isValidEducation(edu)) {
                hasValidEducation = true;
                break;
            }
        }
        if (!hasValidEducation) {
            return false;
        }
        
        // Validate documents - resume URL is mandatory
        if (profile.getResumeUrl() == null || profile.getResumeUrl().trim().isEmpty()) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Validates that an education entry has all required fields
     */
    private boolean isValidEducation(com.dashboard.app.recruitment.model.CandidateEducation education) {
        if (education == null) {
            return false;
        }
        // Check all required fields
        return education.getCollegeName() != null && !education.getCollegeName().trim().isEmpty() &&
               education.getUniversity() != null && !education.getUniversity().trim().isEmpty() &&
               education.getDegree() != null && !education.getDegree().trim().isEmpty() &&
               education.getMajor() != null && !education.getMajor().trim().isEmpty() &&
               education.getStartDate() != null &&
               education.getEndDate() != null &&
               education.getCgpaOrPercentage() != null && !education.getCgpaOrPercentage().trim().isEmpty() &&
               education.getStudyMode() != null && !education.getStudyMode().trim().isEmpty() &&
               education.getCity() != null && !education.getCity().trim().isEmpty() &&
               education.getState() != null && !education.getState().trim().isEmpty() &&
               education.getCountry() != null && !education.getCountry().trim().isEmpty() &&
               education.getPassingYear() != null;
    }
}

