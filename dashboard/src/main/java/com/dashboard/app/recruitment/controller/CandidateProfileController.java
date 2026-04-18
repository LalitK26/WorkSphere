package com.dashboard.app.recruitment.controller;

import com.dashboard.app.recruitment.dto.request.CandidateProfileRequest;
import com.dashboard.app.recruitment.model.Candidate;
import com.dashboard.app.recruitment.model.CandidateEducation;
import com.dashboard.app.recruitment.model.CandidateProfile;
import com.dashboard.app.recruitment.model.Interview;
import com.dashboard.app.recruitment.model.enums.InterviewRound;
import com.dashboard.app.recruitment.repository.CandidateProfileRepository;
import com.dashboard.app.recruitment.repository.CandidateRepository;
import com.dashboard.app.recruitment.repository.InterviewRepository;
import com.dashboard.app.service.FileStorageService;
import com.dashboard.app.util.JwtUtil;
import com.dashboard.app.exception.UnauthorizedException;
import com.dashboard.app.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Optional;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.List;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

@RestController
@RequestMapping("/api/recruitment/candidates/profile")
public class CandidateProfileController {

    private static final Logger logger = LoggerFactory.getLogger(CandidateProfileController.class);

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private InterviewRepository interviewRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getProfile() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();

        // Use method that eagerly loads role to avoid lazy initialization issues
        Optional<Candidate> candidateOpt = candidateRepository.findWithRoleByEmail(email);
        if (candidateOpt.isEmpty()) {
             return ResponseEntity.badRequest().body("Candidate not found");
        }
        Candidate candidate = candidateOpt.get();

        // Use JOIN FETCH query to eagerly load education collection
        Optional<CandidateProfile> profileOpt = candidateProfileRepository.findByCandidateIdWithEducation(candidate.getId());
        
        CandidateProfile profile;
        if (profileOpt.isPresent()) {
            profile = profileOpt.get();
        } else {
            profile = new CandidateProfile();
            // Set the candidate relationship so frontend can access candidate data
            profile.setCandidate(candidate);
        }
        
        // Calculate and add progress percentage to response
        int progressPercentage = calculateProgressPercentage(profile, candidate);
        Map<String, Object> response = new HashMap<>();
        response.put("profile", profile);
        response.put("progressPercentage", progressPercentage);
        
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> saveProfile(@RequestBody CandidateProfileRequest request) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String email = auth.getName();

            // Use method that eagerly loads role to avoid lazy initialization issues
            Optional<Candidate> candidateOpt = candidateRepository.findWithRoleByEmail(email);
            if (candidateOpt.isEmpty()) {
                return ResponseEntity.badRequest().body("Candidate not found");
            }
            Candidate candidate = candidateOpt.get();

            // Use JOIN FETCH query to eagerly load education collection
            CandidateProfile profile = candidateProfileRepository.findByCandidateIdWithEducation(candidate.getId())
                    .orElse(new CandidateProfile());

            // Ensure relationship is set for new profiles
            if (profile.getCandidate() == null) {
                profile.setCandidate(candidate);
            }
            
            // Initialize education list if null (for new profiles)
            if (profile.getEducation() == null) {
                profile.setEducation(new java.util.ArrayList<>());
            }
            
            // Update address fields (only if provided and not Aadhaar-verified)
            if (request.getStreetAddress() != null) {
                if (profile.getAadhaarVerifiedStreetAddress() != null && profile.getAadhaarVerifiedStreetAddress()) {
                    logger.warn("Attempt to update Aadhaar-verified streetAddress for candidate: {}", candidate.getId());
                } else {
                    profile.setStreetAddress(request.getStreetAddress());
                }
            }
            if (request.getCity() != null) {
                if (profile.getAadhaarVerifiedCity() != null && profile.getAadhaarVerifiedCity()) {
                    logger.warn("Attempt to update Aadhaar-verified city for candidate: {}", candidate.getId());
                } else {
                    profile.setCity(request.getCity());
                }
            }
            if (request.getState() != null) {
                if (profile.getAadhaarVerifiedState() != null && profile.getAadhaarVerifiedState()) {
                    logger.warn("Attempt to update Aadhaar-verified state for candidate: {}", candidate.getId());
                } else {
                    profile.setState(request.getState());
                }
            }
            if (request.getZipCode() != null) {
                if (profile.getAadhaarVerifiedZipCode() != null && profile.getAadhaarVerifiedZipCode()) {
                    logger.warn("Attempt to update Aadhaar-verified zipCode for candidate: {}", candidate.getId());
                } else {
                    profile.setZipCode(request.getZipCode());
                }
            }
            if (request.getCountry() != null) {
                profile.setCountry(request.getCountry());
            }
            
            // Update experience fields
            // The frontend sends only one of these fields (the selected one), with the other as null
            // If fresherYears is provided (not null), set it and clear experiencedYears
            if (request.getFresherYears() != null) {
                profile.setFresherYears(request.getFresherYears());
                profile.setExperiencedYears(null);
            } else if (request.getExperiencedYears() != null) {
                // If experiencedYears is provided (not null), set it and clear fresherYears
                profile.setExperiencedYears(request.getExperiencedYears());
                profile.setFresherYears(null);
            }
            // If both are null, we don't update (preserves existing values if any)
            
            // Update document fields (only if provided)
            if (request.getResumeUrl() != null) {
                profile.setResumeUrl(request.getResumeUrl());
            }
            if (request.getPortfolioUrl() != null) {
                profile.setPortfolioUrl(request.getPortfolioUrl());
            }
            if (request.getLinkedInUrl() != null) {
                profile.setLinkedInUrl(request.getLinkedInUrl());
            }
            if (request.getExperienceLetterUrl() != null) {
                profile.setExperienceLetterUrl(request.getExperienceLetterUrl());
            }
            
            // Update Candidate personal info if changed
            // Check if fields are Aadhaar-verified and prevent updates
            boolean candidateUpdated = false;
            if (request.getFirstName() != null && !request.getFirstName().equals(candidate.getFirstName())) {
                // Check if firstName is Aadhaar-verified
                if (profile.getAadhaarVerifiedFirstName() != null && profile.getAadhaarVerifiedFirstName()) {
                    logger.warn("Attempt to update Aadhaar-verified firstName for candidate: {}", candidate.getId());
                } else {
                    candidate.setFirstName(request.getFirstName());
                    candidateUpdated = true;
                }
            }
            if (request.getLastName() != null && !request.getLastName().equals(candidate.getLastName())) {
                // Check if lastName is Aadhaar-verified
                if (profile.getAadhaarVerifiedLastName() != null && profile.getAadhaarVerifiedLastName()) {
                    logger.warn("Attempt to update Aadhaar-verified lastName for candidate: {}", candidate.getId());
                } else {
                    candidate.setLastName(request.getLastName());
                    candidateUpdated = true;
                }
            }
            if (request.getMiddleName() != null) {
                String newMiddleName = request.getMiddleName().trim().isEmpty() ? null : request.getMiddleName();
                if (!java.util.Objects.equals(newMiddleName, candidate.getMiddleName())) {
                    // Check if middleName is Aadhaar-verified
                    if (profile.getAadhaarVerifiedMiddleName() != null && profile.getAadhaarVerifiedMiddleName()) {
                        logger.warn("Attempt to update Aadhaar-verified middleName for candidate: {}", candidate.getId());
                    } else {
                        candidate.setMiddleName(newMiddleName);
                        candidateUpdated = true;
                    }
                }
            }
            if (request.getPhoneNumber() != null && !request.getPhoneNumber().equals(candidate.getPhoneNumber())) {
                candidate.setPhoneNumber(request.getPhoneNumber());
                candidateUpdated = true;
            }
            
            if (candidateUpdated) {
                candidateRepository.save(candidate);
            }
            
            // Handle education BEFORE saving - prepare the education list
            if (request.getEducation() != null) {
                // Clear existing education entries (orphanRemoval will handle deletion)
                // Make sure we're working with a managed entity
                if (profile.getId() != null) {
                    // For existing profiles, clear will trigger orphanRemoval
                    profile.getEducation().clear();
                } else {
                    // For new profiles, just initialize the list
                    if (profile.getEducation() == null) {
                        profile.setEducation(new ArrayList<>());
                    } else {
                        profile.getEducation().clear();
                    }
                }
                
                // Validate and convert education entries before adding
                if (!request.getEducation().isEmpty()) {
                    List<CandidateEducation> validEducation = new ArrayList<>();
                    
                    for (CandidateEducation edu : request.getEducation()) {
                        if (edu == null) {
                            continue;
                        }
                        
                        // Create a new CandidateEducation object to ensure proper type conversion
                        CandidateEducation newEdu = new CandidateEducation();
                        newEdu.setProfile(profile);
                        
                        // Set collegeName (use university if collegeName is not provided)
                        String collegeName = edu.getCollegeName();
                        if (collegeName == null || collegeName.trim().isEmpty()) {
                            collegeName = edu.getUniversity();
                        }
                        if (collegeName == null || collegeName.trim().isEmpty()) {
                            logger.warn("Skipping education entry: collegeName and university are both empty");
                            continue;
                        }
                        newEdu.setCollegeName(collegeName.trim());
                        
                        // Set university
                        if (edu.getUniversity() == null || edu.getUniversity().trim().isEmpty()) {
                            logger.warn("Skipping education entry: university is required");
                            continue;
                        }
                        newEdu.setUniversity(edu.getUniversity().trim());
                        
                        // Set degree
                        if (edu.getDegree() == null || edu.getDegree().trim().isEmpty()) {
                            logger.warn("Skipping education entry: degree is required");
                            continue;
                        }
                        newEdu.setDegree(edu.getDegree().trim());
                        
                        // Set major
                        if (edu.getMajor() == null || edu.getMajor().trim().isEmpty()) {
                            logger.warn("Skipping education entry: major is required");
                            continue;
                        }
                        newEdu.setMajor(edu.getMajor().trim());
                        
                        // Convert and set startDate
                        LocalDate startDate = convertToLocalDate(edu.getStartDate());
                        if (startDate == null) {
                            logger.warn("Skipping education entry: invalid startDate");
                            continue;
                        }
                        newEdu.setStartDate(startDate);
                        
                        // Convert and set endDate
                        LocalDate endDate = convertToLocalDate(edu.getEndDate());
                        if (endDate == null) {
                            logger.warn("Skipping education entry: invalid endDate");
                            continue;
                        }
                        newEdu.setEndDate(endDate);
                        
                        // Set CGPA/Percentage
                        if (edu.getCgpaOrPercentage() == null || edu.getCgpaOrPercentage().trim().isEmpty()) {
                            logger.warn("Skipping education entry: cgpaOrPercentage is required");
                            continue;
                        }
                        newEdu.setCgpaOrPercentage(edu.getCgpaOrPercentage().trim());
                        
                        // Set study mode
                        if (edu.getStudyMode() == null || edu.getStudyMode().trim().isEmpty()) {
                            logger.warn("Skipping education entry: studyMode is required");
                            continue;
                        }
                        newEdu.setStudyMode(edu.getStudyMode().trim());
                        
                        // Set city
                        if (edu.getCity() == null || edu.getCity().trim().isEmpty()) {
                            logger.warn("Skipping education entry: city is required");
                            continue;
                        }
                        newEdu.setCity(edu.getCity().trim());
                        
                        // Set state
                        if (edu.getState() == null || edu.getState().trim().isEmpty()) {
                            logger.warn("Skipping education entry: state is required");
                            continue;
                        }
                        newEdu.setState(edu.getState().trim());
                        
                        // Set country
                        if (edu.getCountry() == null || edu.getCountry().trim().isEmpty()) {
                            logger.warn("Skipping education entry: country is required");
                            continue;
                        }
                        newEdu.setCountry(edu.getCountry().trim());
                        
                        // Convert and set passingYear
                        Integer passingYear = convertToInteger(edu.getPassingYear());
                        if (passingYear == null) {
                            logger.warn("Skipping education entry: invalid passingYear");
                            continue;
                        }
                        newEdu.setPassingYear(passingYear);
                        
                        // Set activeBacklogs (required by entity; default 0 if not provided)
                        Integer activeBacklogs = convertToInteger(edu.getActiveBacklogs());
                        newEdu.setActiveBacklogs(activeBacklogs != null && activeBacklogs >= 0 ? activeBacklogs : 0);
                        
                        validEducation.add(newEdu);
                    }
                    
                    if (!validEducation.isEmpty()) {
                        // Add validated education entries
                        profile.getEducation().addAll(validEducation);
                        logger.info("Prepared {} valid education entries for saving", validEducation.size());
                    } else {
                        logger.warn("No valid education entries found in request after validation");
                    }
                }
            }
            
            // Calculate progress percentage before saving
            int progressPercentage = calculateProgressPercentage(profile, candidate);
            
            // Check if progress reached 100% - automatically mark as complete
            if (progressPercentage >= 100) {
                // Validate all mandatory fields before marking as complete
                if (validateMandatoryFields(profile, candidate)) {
                    profile.setCompleted(true);
                    logger.info("Profile automatically marked as complete - progress reached 100%");
                }
            }
            
            // Check if we are explicitly finalizing - validate all mandatory fields after all updates
            if (request.isCompleted()) {
                // Validate all mandatory fields before marking as complete
                if (!validateMandatoryFields(profile, candidate)) {
                    Map<String, String> error = new HashMap<>();
                    error.put("message", "Cannot mark profile as complete. All mandatory fields must be filled.");
                    error.put("error", "ValidationError");
                    return ResponseEntity.status(400).body(error);
                }
                profile.setCompleted(true);
            }
            
            // Save the profile with all updates including education
            logger.info("Saving profile for candidate ID: {}, with {} education entries", candidate.getId(), profile.getEducation().size());
            CandidateProfile savedProfile = candidateProfileRepository.save(profile);
            logger.info("Profile saved successfully with ID: {}", savedProfile.getId());
            
            // Fetch the saved profile with education eagerly loaded using JOIN FETCH to avoid lazy initialization issues
            Optional<CandidateProfile> fetchedProfile = candidateProfileRepository.findByIdWithEducation(savedProfile.getId());
            CandidateProfile finalProfile;
            if (fetchedProfile.isPresent()) {
                finalProfile = fetchedProfile.get();
                logger.info("Successfully fetched saved profile with {} education entries", finalProfile.getEducation().size());
            } else {
                finalProfile = savedProfile;
                logger.warn("Could not fetch saved profile with education, returning saved profile directly");
            }
            
            // Recalculate progress after save to ensure accuracy
            int finalProgressPercentage = calculateProgressPercentage(finalProfile, candidate);
            
            // Return profile with progress percentage
            Map<String, Object> response = new HashMap<>();
            response.put("profile", finalProfile);
            response.put("progressPercentage", finalProgressPercentage);
            response.put("isCompleted", finalProfile.isCompleted());
            
            return ResponseEntity.ok(response);
        } catch (org.springframework.transaction.UnexpectedRollbackException e) {
            logger.error("Transaction rollback error while saving profile: {}", e.getMessage(), e);
            // Get the root cause
            Throwable rootCause = e.getCause();
            while (rootCause != null && rootCause.getCause() != null) {
                rootCause = rootCause.getCause();
            }
            Map<String, String> error = new HashMap<>();
            error.put("message", "Error saving profile. " + (rootCause != null ? rootCause.getMessage() : e.getMessage()));
            error.put("error", "TransactionRollbackException");
            return ResponseEntity.status(500).body(error);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            e.printStackTrace();
            logger.error("Data integrity violation while saving profile: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "Database constraint violation. Please ensure all required fields are provided correctly.");
            error.put("error", "DataIntegrityViolationException");
            return ResponseEntity.status(500).body(error);
        } catch (org.springframework.dao.DataAccessException e) {
            e.printStackTrace();
            logger.error("Database error while saving profile: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "Database error occurred. Please ensure the database tables are created. Error: " + e.getMessage());
            error.put("error", "DataAccessException");
            return ResponseEntity.status(500).body(error);
        } catch (Exception e) {
            e.printStackTrace();
            logger.error("Unexpected error while saving profile: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "Error saving profile: " + e.getMessage());
            error.put("error", e.getClass().getSimpleName());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/{candidateId}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getCandidateProfileById(@PathVariable Long candidateId, 
                                                      jakarta.servlet.http.HttpServletRequest httpRequest) {
        try {
            // Verify user is admin or recruiter
            String authHeader = httpRequest.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new UnauthorizedException("Authorization header is missing or invalid");
            }

            String token = authHeader.substring(7);
            String role = jwtUtil.extractRole(token);

            if (role == null || role.equals("CANDIDATE")) {
                throw new UnauthorizedException("Access denied. Only recruiters and admins can view candidate profiles.");
            }

            // Find candidate
            Candidate candidate = candidateRepository.findById(candidateId)
                    .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));

            // Use JOIN FETCH query to eagerly load education collection
            Optional<CandidateProfile> profileOpt = candidateProfileRepository.findByCandidateIdWithEducation(candidate.getId());
            
            CandidateProfile profile;
            if (profileOpt.isPresent()) {
                profile = profileOpt.get();
            } else {
                profile = new CandidateProfile();
                // Set the candidate relationship so frontend can access candidate data
                profile.setCandidate(candidate);
            }
            
            // Return profile data
            Map<String, Object> response = new HashMap<>();
            response.put("profile", profile);

            // Also include latest technical interview result/remarks (if any) for this candidate
            try {
                List<Interview> interviews = interviewRepository.findByCandidateId(candidate.getId());

                Interview latestTechnicalInterview = interviews.stream()
                        .filter(i -> i.getInterviewRound() == null || i.getInterviewRound() == InterviewRound.TECHNICAL)
                        .sorted((i1, i2) -> {
                            if (i1.getCreatedAt() == null || i2.getCreatedAt() == null) {
                                return 0;
                            }
                            return i2.getCreatedAt().compareTo(i1.getCreatedAt());
                        })
                        .findFirst()
                        .orElse(null);

                if (latestTechnicalInterview != null) {
                    response.put(
                            "technicalInterviewResult",
                            latestTechnicalInterview.getResult() != null ? latestTechnicalInterview.getResult().name() : null
                    );
                    response.put("technicalInterviewRemarks", latestTechnicalInterview.getRemarks());
                }
            } catch (Exception e) {
                logger.error("Error fetching technical interview remarks for candidate {}: {}", candidateId, e.getMessage(), e);
            }

            return ResponseEntity.ok(response);
        } catch (UnauthorizedException | ResourceNotFoundException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error fetching candidate profile: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "Error fetching candidate profile: " + e.getMessage());
            error.put("error", e.getClass().getSimpleName());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PostMapping("/resume/upload")
    @Transactional
    public ResponseEntity<?> uploadResume(@RequestParam("file") MultipartFile file) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String email = auth.getName();

            Optional<Candidate> candidateOpt = candidateRepository.findWithRoleByEmail(email);
            if (candidateOpt.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Candidate not found");
                return ResponseEntity.badRequest().body(error);
            }
            Candidate candidate = candidateOpt.get();

            // Upload file
            String filePath = fileStorageService.uploadResumeFile(file);
            logger.info("Resume file uploaded for candidate {}: {}", candidate.getId(), filePath);

            // Get or create profile
            CandidateProfile profile = candidateProfileRepository.findByCandidateIdWithEducation(candidate.getId())
                    .orElse(new CandidateProfile());

            // Ensure relationship is set
            if (profile.getCandidate() == null) {
                profile.setCandidate(candidate);
            }

            // Update resume URL with the uploaded file path
            profile.setResumeUrl(filePath);
            candidateProfileRepository.save(profile);

            Map<String, Object> response = new HashMap<>();
            response.put("resumeUrl", filePath);
            response.put("message", "Resume uploaded successfully");

            return ResponseEntity.ok(response);
        } catch (com.dashboard.app.exception.BadRequestException e) {
            logger.error("Bad request while uploading resume: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            error.put("error", "BadRequestException");
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            logger.error("Unexpected error while uploading resume: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "Error uploading resume: " + e.getMessage());
            error.put("error", e.getClass().getSimpleName());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PostMapping("/experience-letter/upload")
    @Transactional
    public ResponseEntity<?> uploadExperienceLetter(@RequestParam("file") MultipartFile file) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String email = auth.getName();

            Optional<Candidate> candidateOpt = candidateRepository.findWithRoleByEmail(email);
            if (candidateOpt.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("message", "Candidate not found");
                return ResponseEntity.badRequest().body(error);
            }
            Candidate candidate = candidateOpt.get();

            // Upload file
            String filePath = fileStorageService.uploadExperienceLetterFile(file);
            logger.info("Experience letter uploaded for candidate {}: {}", candidate.getId(), filePath);

            // Get or create profile
            CandidateProfile profile = candidateProfileRepository.findByCandidateIdWithEducation(candidate.getId())
                    .orElse(new CandidateProfile());

            // Ensure relationship is set
            if (profile.getCandidate() == null) {
                profile.setCandidate(candidate);
            }

            // Update experience letter URL
            profile.setExperienceLetterUrl(filePath);
            candidateProfileRepository.save(profile);

            Map<String, Object> response = new HashMap<>();
            response.put("experienceLetterUrl", filePath);
            response.put("message", "Experience letter uploaded successfully");

            return ResponseEntity.ok(response);
        } catch (com.dashboard.app.exception.BadRequestException e) {
            logger.error("Bad request while uploading experience letter: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("message", e.getMessage());
            error.put("error", "BadRequestException");
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            logger.error("Unexpected error while uploading experience letter: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("message", "Error uploading experience letter: " + e.getMessage());
            error.put("error", e.getClass().getSimpleName());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    /**
     * Converts a date object (String or LocalDate) to LocalDate
     */
    private LocalDate convertToLocalDate(Object dateObj) {
        if (dateObj == null) {
            return null;
        }
        
        if (dateObj instanceof LocalDate) {
            return (LocalDate) dateObj;
        }
        
        if (dateObj instanceof String) {
            String dateStr = ((String) dateObj).trim();
            if (dateStr.isEmpty()) {
                return null;
            }
            
            // Try ISO format first (yyyy-MM-dd)
            try {
                return LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE);
            } catch (DateTimeParseException e) {
                // Try other common formats if needed
                logger.warn("Failed to parse date: {}", dateStr);
                return null;
            }
        }
        
        logger.warn("Unexpected date type: {}", dateObj.getClass().getName());
        return null;
    }
    
    /**
     * Converts an object (String or Integer) to Integer
     */
    private Integer convertToInteger(Object yearObj) {
        if (yearObj == null) {
            return null;
        }
        
        if (yearObj instanceof Integer) {
            return (Integer) yearObj;
        }
        
        if (yearObj instanceof String) {
            String yearStr = ((String) yearObj).trim();
            if (yearStr.isEmpty()) {
                return null;
            }
            
            try {
                return Integer.parseInt(yearStr);
            } catch (NumberFormatException e) {
                logger.warn("Failed to parse passingYear: {}", yearStr);
                return null;
            }
        }
        
        // Try to convert Number types
        if (yearObj instanceof Number) {
            return ((Number) yearObj).intValue();
        }
        
        logger.warn("Unexpected passingYear type: {}", yearObj.getClass().getName());
        return null;
    }
    
    /**
     * Validates that all mandatory fields are filled before marking profile as complete
     */
    private boolean validateMandatoryFields(CandidateProfile profile, Candidate candidate) {
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
        
        // Validate experience information (mandatory field - either fresher or experienced)
        if (profile.getFresherYears() == null && profile.getExperiencedYears() == null) {
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
        for (CandidateEducation edu : profile.getEducation()) {
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
    private boolean isValidEducation(CandidateEducation education) {
        if (education == null) {
            return false;
        }
        // Check all required fields (matching the @Column(nullable = false) annotations)
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
               education.getPassingYear() != null &&
               education.getActiveBacklogs() != null;
    }
    
    /**
     * Calculates the percentage of mandatory fields completed
     * Mandatory fields: firstName, lastName, phoneNumber, experience (fresher or experienced), streetAddress, city, state, zipCode, education (at least one valid), resumeUrl
     * Total: 10 mandatory fields
     */
    private int calculateProgressPercentage(CandidateProfile profile, Candidate candidate) {
        int completedFields = 0;
        int totalMandatoryFields = 10;
        
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
        
        // Experience Information (1 field - either fresher or experienced)
        if (profile.getFresherYears() != null || profile.getExperiencedYears() != null) {
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
            for (CandidateEducation edu : profile.getEducation()) {
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
}
