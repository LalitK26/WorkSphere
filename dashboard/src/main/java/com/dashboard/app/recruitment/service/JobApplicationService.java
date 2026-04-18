package com.dashboard.app.recruitment.service;

import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.exception.UnauthorizedException;
import com.dashboard.app.recruitment.dto.request.ApplyForJobRequest;
import com.dashboard.app.recruitment.dto.request.UpdateApplicationStatusRequest;
import com.dashboard.app.recruitment.dto.response.JobApplicationResponse;
import com.dashboard.app.recruitment.dto.response.JobTitleStatisticsResponse;
import com.dashboard.app.recruitment.model.Candidate;
import com.dashboard.app.recruitment.model.CandidateProfile;
import com.dashboard.app.recruitment.model.JobApplication;
import com.dashboard.app.recruitment.model.JobOpening;
import com.dashboard.app.recruitment.model.enums.ApplicationStatus;
import com.dashboard.app.recruitment.model.enums.JobStatus;
import com.dashboard.app.recruitment.repository.CandidateProfileRepository;
import com.dashboard.app.recruitment.repository.CandidateRepository;
import com.dashboard.app.recruitment.repository.JobApplicationRepository;
import com.dashboard.app.recruitment.repository.JobOpeningRepository;
import com.dashboard.app.recruitment.repository.InterviewRepository;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class JobApplicationService {

    @Autowired
    private JobApplicationRepository jobApplicationRepository;

    @Autowired
    private JobOpeningRepository jobOpeningRepository;

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    @Autowired
    private InterviewRepository interviewRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private com.dashboard.app.recruitment.service.RecruitmentEmailService recruitmentEmailService;
    private static final Logger logger = LoggerFactory.getLogger(JobApplicationService.class);

    private Candidate getCurrentCandidate(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Authorization header is missing or invalid");
        }

        String token = authHeader.substring(7);
        String role = jwtUtil.extractRole(token);

        if (role == null || !role.equals("CANDIDATE")) {
            throw new UnauthorizedException("Access denied. Only candidates can apply for jobs.");
        }

        Long userId = jwtUtil.extractUserId(token);
        return candidateRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));
    }

    public JobApplicationResponse applyForJob(Long jobOpeningId, ApplyForJobRequest request,
            HttpServletRequest httpRequest) {
        Candidate candidate = getCurrentCandidate(httpRequest);

        JobOpening jobOpening = jobOpeningRepository.findById(jobOpeningId)
                .orElseThrow(() -> new ResourceNotFoundException("Job opening not found"));

        if (jobOpening.getStatus() != JobStatus.ACTIVE) {
            if (jobOpening.getStatus() == JobStatus.CLOSED) {
                throw new BadRequestException("This job is closed and no longer accepting applications.");
            }
            throw new BadRequestException("This job is not open for applications. It may be closed or on hold.");
        }

        // Check if candidate has already applied
        if (jobApplicationRepository.existsByJobOpeningIdAndCandidateId(jobOpeningId, candidate.getId())) {
            throw new BadRequestException("You have already applied for this job");
        }

        // Check experience requirement
        Integer jobMinExperience = jobOpening.getMinExperienceYears() != null ? jobOpening.getMinExperienceYears() : 0;
        if (jobMinExperience > 0) {
            CandidateProfile candidateProfile = candidateProfileRepository.findByCandidateId(candidate.getId())
                    .orElse(null);

            if (candidateProfile == null) {
                throw new BadRequestException(
                        "Please complete your profile with experience information before applying");
            }

            // Check if candidate is a fresher
            if (candidateProfile.getFresherYears() != null) {
                // Fresher can only apply for jobs with 0 experience requirement
                throw new BadRequestException(
                        String.format(
                                "This job requires %d+ years of experience. Freshers are not eligible for this position.",
                                jobMinExperience));
            }

            // Check if candidate is experienced
            if (candidateProfile.getExperiencedYears() != null) {
                if (candidateProfile.getExperiencedYears() < jobMinExperience) {
                    throw new BadRequestException(
                            String.format("This job requires %d+ years of experience. You have %d years of experience.",
                                    jobMinExperience, candidateProfile.getExperiencedYears()));
                }
            } else {
                // No experience information set in profile
                throw new BadRequestException(
                        "Please update your profile with your experience information before applying");
            }
        }

        JobApplication application = new JobApplication();
        application.setJobOpening(jobOpening);
        application.setCandidate(candidate);
        application.setStatus(ApplicationStatus.PENDING);
        application.setCoverLetter(request.getCoverLetter());

        JobApplication saved = jobApplicationRepository.save(application);

        // Number of Openings is not modified on apply; it only decreases when a
        // candidate accepts an offer.

        // Send general recruitment notification email to candidate (non-blocking)
        try {
            String first = candidate.getFirstName() != null ? candidate.getFirstName().trim() : "";
            String last = candidate.getLastName() != null ? candidate.getLastName().trim() : "";
            String candidateName = (first + " " + last).trim();
            if (candidateName.isEmpty()) {
                candidateName = candidate.getEmail();
            }

            String jobTitle = jobOpening.getJobTitle();
            String subject = "Application Received – " + (jobTitle != null ? jobTitle : "Your Application");
            String message = "Thank you for applying for the position of "
                    + (jobTitle != null ? jobTitle : "the advertised role")
                    + " at Thynk Technology India. Our recruitment team will review your application and keep you updated on the next steps.";
            String applicationStatus = "Applied";
            String additionalInfo = "You can track the status of your application from your candidate dashboard.";

            recruitmentEmailService.sendStatusNotification(
                    candidate.getEmail(),
                    candidateName,
                    subject,
                    message,
                    jobTitle,
                    applicationStatus,
                    additionalInfo,
                    "https://recruitment.worksphere.ltd",
                    "View Application");
            logger.info("General recruitment notification email sent for application ID: {}", saved.getId());
        } catch (Exception e) {
            logger.error("Failed to send general recruitment notification email for application ID: {}", saved.getId(),
                    e);
        }

        return mapToResponse(saved);
    }

    public List<JobApplicationResponse> getMyApplications(HttpServletRequest httpRequest) {
        Candidate candidate = getCurrentCandidate(httpRequest);

        return jobApplicationRepository.findByCandidateIdOrderByCreatedAtDesc(candidate.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public JobApplicationResponse getApplicationById(Long id, HttpServletRequest httpRequest) {
        Candidate candidate = getCurrentCandidate(httpRequest);

        JobApplication application = jobApplicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        // Ensure the application belongs to the current candidate
        if (!application.getCandidate().getId().equals(candidate.getId())) {
            throw new UnauthorizedException("Access denied. This application does not belong to you.");
        }

        return mapToResponse(application);
    }

    private JobApplicationResponse mapToResponse(JobApplication application) {
        JobApplicationResponse response = new JobApplicationResponse();
        response.setId(application.getId());
        response.setJobOpeningId(application.getJobOpening().getId());
        response.setJobTitle(application.getJobOpening().getJobTitle());
        response.setCompanyName("WorkSphere India");
        response.setCandidateId(application.getCandidate().getId());
        response.setCandidateName(application.getCandidate().getFullName());
        response.setCandidateEmail(application.getCandidate().getEmail());
        response.setCandidatePhone(application.getCandidate().getPhoneNumber());
        response.setStatus(application.getStatus().name());
        response.setCoverLetter(application.getCoverLetter());
        response.setCreatedAt(application.getCreatedAt());
        response.setUpdatedAt(application.getUpdatedAt());

        // Add candidate profile information if available
        CandidateProfile profile = candidateProfileRepository.findByCandidateId(application.getCandidate().getId())
                .orElse(null);
        if (profile != null) {
            response.setResumeUrl(profile.getResumeUrl());
            response.setPortfolioUrl(profile.getPortfolioUrl());
            response.setFresherYears(profile.getFresherYears());
            response.setExperiencedYears(profile.getExperiencedYears());
            response.setExperienceLetterUrl(profile.getExperienceLetterUrl());
            response.setExperienceLetterUrl(profile.getExperienceLetterUrl());
        }

        // Add latest technical interview outcome
        interviewRepository.findFirstByInterviewAssignment_JobApplication_IdAndInterviewRoundOrderByCreatedAtDesc(
                application.getId(), com.dashboard.app.recruitment.model.enums.InterviewRound.TECHNICAL)
                .ifPresent(interview -> {
                    response.setTechnicalInterviewResult(interview.getResult().name());
                    response.setTechnicalInterviewRemarks(interview.getRemarks());
                });

        // Add stage-specific status
        response.setScreeningStatus(application.getScreeningStatus());
        response.setTechnicalStatus(application.getTechnicalStatus());
        response.setHrStatus(application.getHrStatus());
        response.setOfferStatus(application.getOfferStatus());

        return response;
    }

    public List<JobApplicationResponse> getAllApplications(HttpServletRequest httpRequest) {
        // Verify user is admin or recruiter
        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Authorization header is missing or invalid");
        }

        String token = authHeader.substring(7);
        String role = jwtUtil.extractRole(token);

        if (role == null || role.equals("CANDIDATE")) {
            throw new UnauthorizedException("Access denied. Only recruiters and admins can view all applications.");
        }

        return jobApplicationRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public org.springframework.data.domain.Page<JobApplicationResponse> getAllApplications(
            org.springframework.data.domain.Pageable pageable, HttpServletRequest httpRequest) {
        // Verify user is admin or recruiter
        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Authorization header is missing or invalid");
        }

        String token = authHeader.substring(7);
        String role = jwtUtil.extractRole(token);

        if (role == null || role.equals("CANDIDATE")) {
            throw new UnauthorizedException("Access denied. Only recruiters and admins can view all applications.");
        }

        return jobApplicationRepository.findAll(pageable)
                .map(this::mapToResponse);
    }

    public JobApplicationResponse updateApplicationStatus(Long id, UpdateApplicationStatusRequest request,
            HttpServletRequest httpRequest) {
        // Verify user is admin or recruiter
        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Authorization header is missing or invalid");
        }

        String token = authHeader.substring(7);
        String role = jwtUtil.extractRole(token);

        if (role == null || role.equals("CANDIDATE")) {
            throw new UnauthorizedException("Access denied. Only recruiters and admins can update application status.");
        }

        JobApplication application = jobApplicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        JobOpening job = application.getJobOpening();
        if (job != null && job.getStatus() == JobStatus.CLOSED) {
            throw new BadRequestException(
                    "This job is closed. Shortlisting and status updates are no longer allowed for this position.");
        }

        try {
            ApplicationStatus newStatus = ApplicationStatus.valueOf(request.getStatus().toUpperCase());
            application.setStatus(newStatus);

            // Update screening status based on application status
            if (newStatus == ApplicationStatus.SHORTLISTED) {
                application.setScreeningStatus("PASSED");
            } else if (newStatus == ApplicationStatus.REJECTED) {
                application.setScreeningStatus("REJECTED");
            }
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status: " + request.getStatus());
        }

        JobApplication updated = jobApplicationRepository.save(application);

        // Send rejection email if status is REJECTED
        if (updated.getStatus() == ApplicationStatus.REJECTED) {
            try {
                Candidate candidate = updated.getCandidate();
                String first = candidate.getFirstName() != null ? candidate.getFirstName().trim() : "";
                String last = candidate.getLastName() != null ? candidate.getLastName().trim() : "";
                String candidateName = (first + " " + last).trim();
                if (candidateName.isEmpty()) {
                    candidateName = candidate.getEmail();
                }

                String jobTitle = updated.getJobOpening().getJobTitle();
                recruitmentEmailService.sendRejectionEmail(candidate.getEmail(), candidateName, jobTitle);
                logger.info("Rejection email sent for application ID: {}", updated.getId());
            } catch (Exception e) {
                logger.error("Failed to send rejection email for application ID: {}", updated.getId(), e);
            }
        }

        // Document upload email removed from here. It is now triggered when the offer
        // letter is sent.
        // if (updated.getStatus() == ApplicationStatus.SHORTLISTED) { ... }

        return mapToResponse(updated);
    }

    public List<JobTitleStatisticsResponse> getJobTitleStatistics(HttpServletRequest httpRequest) {
        try {
            // Verify user is admin or recruiter
            String authHeader = httpRequest.getHeader("Authorization");
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                throw new UnauthorizedException("Authorization header is missing or invalid");
            }

            String token = authHeader.substring(7);
            String role = jwtUtil.extractRole(token);

            if (role == null || role.equals("CANDIDATE")) {
                throw new UnauthorizedException("Access denied. Only recruiters and admins can view statistics.");
            }

            // Try to get statistics directly from database using optimized query
            List<JobTitleStatisticsResponse> statistics;
            try {
                List<Object[]> results = jobApplicationRepository.getJobTitleStatistics();
                logger.info("Fetched {} job title statistics from database using query", results.size());

                statistics = results.stream()
                        .filter(result -> result != null && result.length >= 2 && result[0] != null
                                && result[1] != null)
                        .map(result -> {
                            try {
                                String jobTitle = result[0].toString();
                                Long count = ((Number) result[1]).longValue();
                                return new JobTitleStatisticsResponse(jobTitle, count);
                            } catch (Exception e) {
                                logger.error("Error mapping statistics result: {}", e.getMessage());
                                return null;
                            }
                        })
                        .filter(response -> response != null)
                        .sorted((a, b) -> a.getJobTitle().compareToIgnoreCase(b.getJobTitle()))
                        .collect(Collectors.toList());
            } catch (Exception queryException) {
                logger.warn("Query-based statistics failed, falling back to in-memory grouping: {}",
                        queryException.getMessage());
                // Fallback: use findAll and group in memory
                Map<String, Long> statsMap = jobApplicationRepository.findAll().stream()
                        .filter(app -> app.getJobOpening() != null && app.getJobOpening().getJobTitle() != null)
                        .collect(Collectors.groupingBy(
                                app -> app.getJobOpening().getJobTitle(),
                                Collectors.counting()));

                statistics = statsMap.entrySet().stream()
                        .map(entry -> new JobTitleStatisticsResponse(entry.getKey(), entry.getValue()))
                        .sorted((a, b) -> a.getJobTitle().compareToIgnoreCase(b.getJobTitle()))
                        .collect(Collectors.toList());

                logger.info("Fetched {} job title statistics using fallback method", statistics.size());
            }

            return statistics;
        } catch (UnauthorizedException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Error fetching job title statistics: {}", e.getMessage(), e);
            throw new BadRequestException("Failed to fetch job title statistics: " + e.getMessage());
        }
    }

    public List<JobApplicationResponse> getApplicationsByJobTitle(String jobTitle, HttpServletRequest httpRequest) {
        // Verify user is admin or recruiter
        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Authorization header is missing or invalid");
        }

        String token = authHeader.substring(7);
        String role = jwtUtil.extractRole(token);

        if (role == null || role.equals("CANDIDATE")) {
            throw new UnauthorizedException("Access denied. Only recruiters and admins can view applications.");
        }

        return jobApplicationRepository.findByJobTitle(jobTitle).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
}
