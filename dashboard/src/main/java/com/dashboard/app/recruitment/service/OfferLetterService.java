package com.dashboard.app.recruitment.service;

import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.exception.UnauthorizedException;
import com.dashboard.app.recruitment.dto.request.GenerateOfferRequest;
import com.dashboard.app.recruitment.dto.response.OfferLetterResponse;
import com.dashboard.app.recruitment.model.*;
import com.dashboard.app.recruitment.model.enums.OfferStatus;
import com.dashboard.app.recruitment.model.enums.JobStatus;
import com.dashboard.app.recruitment.repository.*;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class OfferLetterService {

    private static final Logger logger = LoggerFactory.getLogger(OfferLetterService.class);

    @Autowired
    private OfferLetterRepository offerLetterRepository;

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private JobOpeningRepository jobOpeningRepository;

    @Autowired
    private RecruitmentUserRepository recruitmentUserRepository;

    @Autowired
    private JobApplicationRepository jobApplicationRepository;

    @Autowired
    private OfferTemplateService offerTemplateService;

    @Autowired
    private OfferPdfService offerPdfService;

    @Autowired
    private EmployeeIdSequenceService employeeIdSequenceService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private RecruitmentEmailService recruitmentEmailService;

    /**
     * Generate a new offer letter for a candidate
     * Only Admin/Recruiter can generate offers
     * Candidate must be HR-shortlisted (ApplicationStatus.ACCEPTED)
     */
    public OfferLetterResponse generateOffer(GenerateOfferRequest request, HttpServletRequest httpRequest) {
        // Verify user is admin or recruiter
        RecruitmentUser currentUser = getCurrentUser(httpRequest);
        verifyAdminOrRecruiter(httpRequest);

        // Validate candidate exists
        Candidate candidate = candidateRepository.findById(request.getCandidateId())
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));

        // Validate job opening exists
        JobOpening jobOpening = jobOpeningRepository.findById(request.getJobOpeningId())
                .orElseThrow(() -> new ResourceNotFoundException("Job opening not found"));

        // Validate candidate is HR-shortlisted
        JobApplication application = jobApplicationRepository
                .findByJobOpeningIdAndCandidateId(request.getJobOpeningId(), request.getCandidateId())
                .orElseThrow(() -> new BadRequestException(
                        "Candidate has not applied for this job opening"));

        if (!application.getStatus().name().equals("ACCEPTED")) {
            throw new BadRequestException(
                    "Candidate must be HR-shortlisted (status: ACCEPTED) before generating offer. Current status: "
                            + application.getStatus().name());
        }

        int openings = jobOpening.getNumberOfOpenings() != null ? jobOpening.getNumberOfOpenings() : 0;
        if (openings <= 0) {
            throw new BadRequestException(
                    "No positions remaining for this job. Number of openings must be greater than 0 to generate an offer.");
        }

        // Check if offer already exists for this candidate and job
        if (offerLetterRepository.existsByCandidateIdAndJobOpeningId(request.getCandidateId(),
                request.getJobOpeningId())) {
            throw new BadRequestException("An offer letter already exists for this candidate and job opening");
        }

        // Generate employee ID using sequence service (production-safe)
        String employeeId = employeeIdSequenceService.getNextEmployeeId();

        // Create offer letter
        OfferLetter offerLetter = new OfferLetter();
        offerLetter.setCandidate(candidate);
        offerLetter.setJobOpening(jobOpening);
        offerLetter.setEmployeeId(employeeId);
        offerLetter.setJobTitle(jobOpening.getJobTitle());
        offerLetter.setPosition(request.getPosition());
        offerLetter.setDepartment(request.getDepartment());
        offerLetter.setStipendAmount(request.getStipendAmount());
        offerLetter.setCtcAmount(request.getCtcAmount());
        offerLetter.setJoiningDate(request.getJoiningDate());
        offerLetter.setOfferDate(request.getOfferDate() != null ? request.getOfferDate() : LocalDate.now());
        offerLetter.setStatus(OfferStatus.CREATED);
        offerLetter.setCreatedBy(currentUser);

        OfferLetter saved = offerLetterRepository.save(offerLetter);
        logger.info("Generated offer letter with ID: {} for candidate: {}", saved.getId(), candidate.getEmail());

        return mapToResponse(saved);
    }

    /**
     * Get offer letter by ID with access control
     */
    public OfferLetterResponse getOfferById(Long id, HttpServletRequest httpRequest) {
        OfferLetter offer = offerLetterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Offer letter not found"));

        // Check access rights
        String role = extractRole(httpRequest);
        if (role.equals("CANDIDATE")) {
            // Candidates can only view their own offers
            Long userId = extractUserId(httpRequest);
            if (!offer.getCandidate().getId().equals(userId)) {
                throw new UnauthorizedException("Access denied. You can only view your own offer letters.");
            }
        }

        return mapToResponse(offer);
    }

    /**
     * Get all offers for a specific candidate (Admin/Recruiter only)
     */
    public List<OfferLetterResponse> getOffersByCandidate(Long candidateId, HttpServletRequest httpRequest) {
        verifyAdminOrRecruiter(httpRequest);

        List<OfferLetter> offers = offerLetterRepository.findByCandidateId(candidateId);
        return offers.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Send offer to candidate (Admin/Recruiter only)
     * Changes status from CREATED to SENT
     */
    @Transactional
    public OfferLetterResponse sendOffer(Long offerId, HttpServletRequest httpRequest) {
        verifyAdminOrRecruiter(httpRequest);

        OfferLetter offer = offerLetterRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer letter not found"));

        if (offer.getStatus() != OfferStatus.CREATED) {
            throw new BadRequestException("Only offers in CREATED status can be sent. Current status: "
                    + offer.getStatus().name());
        }

        offer.setStatus(OfferStatus.SENT);
        offer.setSentAt(java.time.LocalDateTime.now());
        offerLetterRepository.save(offer);

        // Update offer status on job application
        JobApplication application = jobApplicationRepository
                .findByJobOpeningIdAndCandidateId(offer.getJobOpening().getId(), offer.getCandidate().getId())
                .orElse(null);
        if (application != null) {
            application.setOfferStatus("SENT");
            jobApplicationRepository.save(application);
        }

        logger.info("Offer {} sent to candidate {}", offerId, offer.getCandidate().getEmail());

        // Send email notification to candidate
        try {
            Candidate candidate = offer.getCandidate();
            String first = candidate.getFirstName() != null ? candidate.getFirstName().trim() : "";
            String last = candidate.getLastName() != null ? candidate.getLastName().trim() : "";
            String candidateName = (first + " " + last).trim();
            if (candidateName.isEmpty()) {
                candidateName = candidate.getEmail();
            }
            String jobTitle = offer.getJobTitle() != null ? offer.getJobTitle() : offer.getJobOpening().getJobTitle();
            String department = offer.getDepartment();
            LocalDate offerDate = offer.getOfferDate();
            LocalDate joiningDate = offer.getJoiningDate();
            String employeeId = offer.getEmployeeId();

            // Construct offer letter URL - candidates can view their offers via the portal
            // The URL should point to the candidate's view of the offer in the recruitment
            // portal
            String offerLetterUrl = null; // Will be handled by the portal URL in the email template

            // Get recruiter name from the user who created the offer
            RecruitmentUser recruiter = offer.getCreatedBy();
            String recruiterName = recruiter != null && recruiter.getName() != null
                    ? recruiter.getName()
                    : (recruiter != null ? recruiter.getEmail() : "Recruitment Team");

            recruitmentEmailService.sendOfferLetter(
                    candidate.getEmail(),
                    candidateName,
                    jobTitle,
                    department,
                    offerDate,
                    joiningDate,
                    employeeId,
                    offerLetterUrl,
                    null, // portalUrlOverride - use default
                    recruiterName,
                    offer);
            logger.info("Offer letter email sent to candidate: {}", candidate.getEmail());

            // Send document upload required email immediately after offer letter
            recruitmentEmailService.sendDocumentUploadRequired(
                    candidate.getEmail(),
                    candidateName,
                    jobTitle);
            logger.info("Document upload email sent to candidate: {}", candidate.getEmail());
        } catch (Exception e) {
            // Log error but don't fail offer sending if email fails
            logger.error("Failed to send offer letter email to candidate: {}", offer.getCandidate().getEmail(), e);
        }

        return mapToResponse(offer);
    }

    /**
     * Accept offer (Candidate only)
     * Changes status from SENT to ACCEPTED
     */
    @Transactional
    public OfferLetterResponse acceptOffer(Long offerId, HttpServletRequest httpRequest) {
        Candidate candidate = getCurrentCandidate(httpRequest);

        OfferLetter offer = offerLetterRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer letter not found"));

        // Verify offer belongs to this candidate
        if (!offer.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedException("Access denied. This offer does not belong to you.");
        }

        if (offer.getStatus() != OfferStatus.SENT) {
            throw new BadRequestException("Only sent offers can be accepted. Current status: "
                    + offer.getStatus().name());
        }

        // Decrement Number of Openings only on offer accept. Use pessimistic lock for
        // concurrency safety.
        JobOpening job = offer.getJobOpening();
        JobOpening locked = jobOpeningRepository.findByIdWithLock(job.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Job opening not found"));
        int current = locked.getNumberOfOpenings() != null ? locked.getNumberOfOpenings() : 0;
        if (current <= 0) {
            throw new BadRequestException("No positions remaining for this job. The offer cannot be accepted.");
        }
        locked.setNumberOfOpenings(current - 1);

        if (locked.getNumberOfOpenings() == 0) {
            locked.setStatus(JobStatus.CLOSED);
        }

        jobOpeningRepository.save(locked);

        offer.setStatus(OfferStatus.ACCEPTED);
        offer.setRespondedAt(java.time.LocalDateTime.now());
        offerLetterRepository.save(offer);

        // Update offer status on job application
        JobApplication application = jobApplicationRepository
                .findByJobOpeningIdAndCandidateId(offer.getJobOpening().getId(), offer.getCandidate().getId())
                .orElse(null);
        if (application != null) {
            application.setOfferStatus("ACCEPTED");
            jobApplicationRepository.save(application);
        }

        logger.info("Offer {} accepted by candidate {}; job {} numberOfOpenings decremented to {}",
                offerId, candidate.getEmail(), job.getId(), locked.getNumberOfOpenings());

        return mapToResponse(offer);
    }

    /**
     * Reject offer (Candidate only)
     * Changes status from SENT to REJECTED
     */
    @Transactional
    public OfferLetterResponse rejectOffer(Long offerId, HttpServletRequest httpRequest) {
        Candidate candidate = getCurrentCandidate(httpRequest);

        OfferLetter offer = offerLetterRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer letter not found"));

        // Verify offer belongs to this candidate
        if (!offer.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedException("Access denied. This offer does not belong to you.");
        }

        if (offer.getStatus() != OfferStatus.SENT) {
            throw new BadRequestException("Only sent offers can be rejected. Current status: "
                    + offer.getStatus().name());
        }

        offer.setStatus(OfferStatus.REJECTED);
        offer.setRespondedAt(java.time.LocalDateTime.now());
        offerLetterRepository.save(offer);

        // Update offer status on job application
        JobApplication application = jobApplicationRepository
                .findByJobOpeningIdAndCandidateId(offer.getJobOpening().getId(), offer.getCandidate().getId())
                .orElse(null);
        if (application != null) {
            application.setOfferStatus("REJECTED");
            jobApplicationRepository.save(application);
        }

        logger.info("Offer {} rejected by candidate {}", offerId, candidate.getEmail());

        return mapToResponse(offer);
    }

    /**
     * Get all offers for current candidate (Candidate only)
     */
    public List<OfferLetterResponse> getMyOffers(HttpServletRequest httpRequest) {
        Candidate candidate = getCurrentCandidate(httpRequest);

        List<OfferLetter> offers = offerLetterRepository.findByCandidateId(candidate.getId());
        return offers.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all offers in the system (Admin/Recruiter only)
     * Returns only the latest active offer for each unique candidate-job
     * combination
     * to prevent duplicates in the UI
     */
    public List<OfferLetterResponse> getAllOffers(HttpServletRequest httpRequest) {
        verifyAdminOrRecruiter(httpRequest);

        List<OfferLetter> offers = offerLetterRepository.findLatestUniqueOffers();
        return offers.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all offers in the system (Admin/Recruiter only) - Paginated
     */
    public org.springframework.data.domain.Page<OfferLetterResponse> getAllOffers(
            org.springframework.data.domain.Pageable pageable, HttpServletRequest httpRequest) {
        verifyAdminOrRecruiter(httpRequest);

        org.springframework.data.domain.Page<OfferLetter> offers = offerLetterRepository
                .findLatestUniqueOffers(pageable);
        return offers.map(this::mapToResponse);
    }

    /**
     * Download offer letter as PDF
     */
    @Transactional(readOnly = true)
    public byte[] downloadOfferPdf(Long id, HttpServletRequest httpRequest) {
        try {
            logger.info("Starting PDF download for offer letter ID: {}", id);

            // Use JOIN FETCH to eagerly load all relationships and prevent lazy loading
            // issues
            OfferLetter offer = offerLetterRepository.findByIdWithRelations(id)
                    .orElseGet(() -> {
                        // Fallback to regular findById if JOIN FETCH fails
                        logger.warn("JOIN FETCH query failed, falling back to regular findById for offer ID: {}", id);
                        return offerLetterRepository.findById(id)
                                .orElseThrow(() -> {
                                    logger.error("Offer letter not found with ID: {}", id);
                                    return new ResourceNotFoundException("Offer letter not found");
                                });
                    });

            logger.debug("Offer letter found: ID={}, EmployeeID={}", offer.getId(), offer.getEmployeeId());

            // Check access rights
            String role = extractRole(httpRequest);
            logger.debug("User role: {}", role);

            if (role.equals("CANDIDATE")) {
                Long userId = extractUserId(httpRequest);
                if (offer.getCandidate() == null) {
                    logger.error("Candidate is null for offer ID: {}", id);
                    throw new RuntimeException("Offer letter data is incomplete: candidate information is missing");
                }
                if (!offer.getCandidate().getId().equals(userId)) {
                    logger.warn("Access denied: Candidate {} tried to download offer {} belonging to candidate {}",
                            userId, id, offer.getCandidate().getId());
                    throw new UnauthorizedException("Access denied. You can only download your own offer letters.");
                }

                logger.debug("Access granted for candidate ID: {}", userId);
            }

            // Generate HTML from template
            logger.debug("Generating HTML from template for offer ID: {}", id);
            String html = offerTemplateService.generateOfferHtml(offer);

            if (html == null || html.trim().isEmpty()) {
                logger.error("Generated HTML is null or empty for offer ID: {}", id);
                throw new RuntimeException("Failed to generate offer HTML: HTML content is empty");
            }
            logger.debug("HTML generated successfully, length: {} characters", html.length());

            // Convert to PDF
            logger.debug("Converting HTML to PDF for offer ID: {}", id);
            byte[] pdfBytes = offerPdfService.generatePdfFromHtml(html);

            if (pdfBytes == null || pdfBytes.length == 0) {
                logger.error("Generated PDF is null or empty for offer ID: {}", id);
                throw new RuntimeException("Failed to generate PDF: PDF bytes are empty");
            }

            logger.info("Successfully generated PDF for offer ID: {}, PDF size: {} bytes", id, pdfBytes.length);
            return pdfBytes;

        } catch (ResourceNotFoundException | UnauthorizedException e) {
            // Re-throw these as-is
            throw e;
        } catch (Exception e) {
            logger.error("Error downloading offer PDF for ID: {}", id, e);
            throw new RuntimeException("Failed to download offer PDF: " + e.getMessage(), e);
        }
    }

    /**
     * Map entity to response DTO
     */
    private OfferLetterResponse mapToResponse(OfferLetter offer) {
        OfferLetterResponse response = new OfferLetterResponse();
        response.setId(offer.getId());
        response.setEmployeeId(offer.getEmployeeId());
        response.setJobTitle(offer.getJobTitle());
        response.setPosition(offer.getPosition());
        response.setDepartment(offer.getDepartment());
        response.setStipendAmount(offer.getStipendAmount());
        response.setCtcAmount(offer.getCtcAmount());
        response.setJoiningDate(offer.getJoiningDate());
        response.setOfferDate(offer.getOfferDate());
        response.setStatus(offer.getStatus().name());
        response.setSentAt(offer.getSentAt());
        response.setRespondedAt(offer.getRespondedAt());
        response.setDocumentsVerified(offer.getDocumentsVerified());

        // Candidate details
        Candidate candidate = offer.getCandidate();
        response.setCandidateId(candidate.getId());
        response.setCandidateName(candidate.getFullName());
        response.setCandidateEmail(candidate.getEmail());
        response.setCandidatePhone(candidate.getPhoneNumber());

        // Job opening details
        JobOpening job = offer.getJobOpening();
        response.setJobOpeningId(job.getId());
        response.setJobName(job.getJobName());
        response.setDepartment(job.getDepartment());
        response.setLocation(job.getLocation());
        response.setJobApplied(job.getJobTitle()); // Set the exact job title for the "Job Applied" column

        // Set created by details
        RecruitmentUser createdBy = offer.getCreatedBy();
        if (createdBy != null) {
            response.setCreatedById(createdBy.getId());
            response.setCreatedByName(createdBy.getName());
        }

        // Audit fields
        response.setCreatedAt(offer.getCreatedAt());
        response.setUpdatedAt(offer.getUpdatedAt());

        return response;
    }

    /**
     * Get current user from JWT token
     */
    private RecruitmentUser getCurrentUser(HttpServletRequest request) {
        Long userId = extractUserId(request);
        return recruitmentUserRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    /**
     * Get current candidate from JWT token
     */
    private Candidate getCurrentCandidate(HttpServletRequest request) {
        String role = extractRole(request);
        if (!role.equals("CANDIDATE")) {
            throw new UnauthorizedException("Access denied. Only candidates can perform this action.");
        }

        Long userId = extractUserId(request);
        return candidateRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));
    }

    /**
     * Verify user is Admin or Recruiter
     */
    private void verifyAdminOrRecruiter(HttpServletRequest request) {
        String role = extractRole(request);
        if (role.equals("CANDIDATE")) {
            throw new UnauthorizedException("Access denied. Only recruiters and admins can perform this action.");
        }
    }

    /**
     * Extract role from JWT token
     */
    private String extractRole(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Authorization header is missing or invalid");
        }

        String token = authHeader.substring(7);
        return jwtUtil.extractRole(token);
    }

    /**
     * Extract user ID from JWT token
     */
    private Long extractUserId(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Authorization header is missing or invalid");
        }

        String token = authHeader.substring(7);
        return jwtUtil.extractUserId(token);
    }
}
