package com.dashboard.app.recruitment.service;

import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.exception.UnauthorizedException;
import com.dashboard.app.recruitment.dto.request.CreateJobOpeningRequest;
import com.dashboard.app.recruitment.dto.request.UpdateJobOpeningRequest;
import com.dashboard.app.recruitment.dto.response.JobOpeningResponse;
import com.dashboard.app.recruitment.dto.response.JobOpeningStatisticsResponse;
import com.dashboard.app.recruitment.model.JobOpening;
import com.dashboard.app.recruitment.model.RecruitmentUser;
import com.dashboard.app.recruitment.model.enums.JobStatus;
import com.dashboard.app.recruitment.model.enums.JobType;
import com.dashboard.app.recruitment.model.enums.WorkMode;
import com.dashboard.app.recruitment.repository.JobOpeningRepository;
import com.dashboard.app.recruitment.repository.RecruitmentUserRepository;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class JobOpeningService {

    @Autowired
    private JobOpeningRepository jobOpeningRepository;

    @Autowired
    private RecruitmentUserRepository recruitmentUserRepository;

    @Autowired
    private JwtUtil jwtUtil;

    private void validateRole(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Authorization header is missing or invalid");
        }

        String token = authHeader.substring(7);
        String role = jwtUtil.extractRole(token);

        if (role == null || (!role.equals("RECRUITMENT_ADMIN") && !role.equals("RECRUITER"))) {
            throw new UnauthorizedException("Access denied. Only admin or recruiter users can access job openings.");
        }
    }

    private RecruitmentUser getCurrentUser(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        String token = authHeader.substring(7);
        Long userId = jwtUtil.extractUserId(token);

        return recruitmentUserRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    public JobOpeningResponse createJobOpening(CreateJobOpeningRequest request, HttpServletRequest httpRequest) {
        validateRole(httpRequest);
        RecruitmentUser currentUser = getCurrentUser(httpRequest);

        JobOpening jobOpening = new JobOpening();
        jobOpening.setJobTitle(request.getJobTitle());
        jobOpening.setJobName(request.getJobName());
        jobOpening.setLocation(request.getLocation());

        try {
            jobOpening.setJobType(JobType.valueOf(request.getJobType().toUpperCase()));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(
                    "Invalid job type. Must be one of: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, TEMPORARY");
        }

        try {
            jobOpening.setWorkMode(WorkMode.valueOf(request.getWorkMode().toUpperCase()));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid work mode. Must be one of: REMOTE, ONSITE, HYBRID");
        }

        jobOpening.setDepartment(request.getDepartment());
        jobOpening.setApplicationDate(request.getApplicationDate());
        jobOpening.setExpectedJoiningDate(request.getExpectedJoiningDate());
        int numOpenings = request.getNumberOfOpenings() != null ? request.getNumberOfOpenings() : 0;
        if (numOpenings < 0) {
            throw new BadRequestException("Number of openings cannot be negative.");
        }
        jobOpening.setNumberOfOpenings(numOpenings);
        jobOpening.setMinExperienceYears(request.getMinExperienceYears() != null ? request.getMinExperienceYears() : 0);
        jobOpening.setRequiredSkills(request.getRequiredSkills());
        if (numOpenings == 0) {
            jobOpening.setStatus(JobStatus.CLOSED);
            jobOpening.setClosedAt(java.time.LocalDateTime.now());
        } else {
            jobOpening.setStatus(JobStatus.ACTIVE);
        }
        jobOpening.setPostedDate(LocalDate.now());
        jobOpening.setCreatedBy(currentUser);

        JobOpening saved = jobOpeningRepository.save(jobOpening);
        return mapToResponse(saved);
    }

    public JobOpeningResponse updateJobOpening(Long id, UpdateJobOpeningRequest request,
            HttpServletRequest httpRequest) {
        validateRole(httpRequest);

        JobOpening jobOpening = jobOpeningRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job opening not found"));

        jobOpening.setJobTitle(request.getJobTitle());
        jobOpening.setJobName(request.getJobName());
        jobOpening.setLocation(request.getLocation());

        try {
            jobOpening.setJobType(JobType.valueOf(request.getJobType().toUpperCase()));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException(
                    "Invalid job type. Must be one of: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, TEMPORARY");
        }

        try {
            jobOpening.setWorkMode(WorkMode.valueOf(request.getWorkMode().toUpperCase()));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid work mode. Must be one of: REMOTE, ONSITE, HYBRID");
        }

        jobOpening.setDepartment(request.getDepartment());
        jobOpening.setApplicationDate(request.getApplicationDate());
        jobOpening.setExpectedJoiningDate(request.getExpectedJoiningDate());
        boolean reopenedByIncreasingOpenings = false;
        if (request.getNumberOfOpenings() != null) {
            int requested = request.getNumberOfOpenings();
            if (requested < 0) {
                throw new BadRequestException("Number of openings cannot be negative.");
            }
            int current = jobOpening.getNumberOfOpenings() != null ? jobOpening.getNumberOfOpenings() : 0;
            if (requested > current) {
                if (jobOpening.getStatus() == JobStatus.CLOSED) {
                    jobOpening.setNumberOfOpenings(requested);
                    jobOpening.setStatus(JobStatus.ACTIVE);
                    jobOpening.setClosedAt(null);
                    reopenedByIncreasingOpenings = true;
                } else {
                    throw new BadRequestException(
                            "Number of openings cannot be increased for open jobs. Close the job first, then increase openings to reopen.");
                }
            } else {
                jobOpening.setNumberOfOpenings(requested);
                if (requested == 0) {
                    jobOpening.setStatus(JobStatus.CLOSED);
                    jobOpening.setClosedAt(LocalDateTime.now());
                }
            }
        }
        if (request.getMinExperienceYears() != null) {
            jobOpening.setMinExperienceYears(request.getMinExperienceYears());
        }
        if (request.getRequiredSkills() != null) {
            jobOpening.setRequiredSkills(request.getRequiredSkills());
        }

        if (!reopenedByIncreasingOpenings && request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            try {
                JobStatus newStatus = JobStatus.valueOf(request.getStatus().toUpperCase());
                jobOpening.setStatus(newStatus);
                if (newStatus == JobStatus.CLOSED) {
                    jobOpening.setClosedAt(LocalDateTime.now());
                } else if (newStatus == JobStatus.ACTIVE) {
                    jobOpening.setClosedAt(null);
                }
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid status. Must be one of: ACTIVE, ON_HOLD, CLOSED");
            }
        }

        JobOpening saved = jobOpeningRepository.save(jobOpening);
        return mapToResponse(saved);
    }

    public JobOpeningResponse closeJobOpening(Long id, HttpServletRequest httpRequest) {
        validateRole(httpRequest);

        JobOpening jobOpening = jobOpeningRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job opening not found"));

        jobOpening.setStatus(JobStatus.CLOSED);
        jobOpening.setClosedAt(LocalDateTime.now());
        JobOpening saved = jobOpeningRepository.save(jobOpening);
        return mapToResponse(saved);
    }

    public List<JobOpeningResponse> getAllJobOpenings(HttpServletRequest httpRequest) {
        validateRole(httpRequest);

        return jobOpeningRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public org.springframework.data.domain.Page<JobOpeningResponse> getAllJobOpenings(
            org.springframework.data.domain.Pageable pageable, HttpServletRequest httpRequest) {
        validateRole(httpRequest);

        return jobOpeningRepository.findAll(pageable)
                .map(this::mapToResponse);
    }

    public JobOpeningResponse getJobOpeningById(Long id, HttpServletRequest httpRequest) {
        validateRole(httpRequest);

        JobOpening jobOpening = jobOpeningRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job opening not found"));
        return mapToResponse(jobOpening);
    }

    public JobOpeningStatisticsResponse getStatistics(HttpServletRequest httpRequest) {
        validateRole(httpRequest);

        Long activeOpenings = jobOpeningRepository.countByStatusAndNumberOfOpeningsGreaterThan(JobStatus.ACTIVE, 0);
        Long onHold = jobOpeningRepository.countByStatus(JobStatus.ON_HOLD);

        Long totalOpenings = jobOpeningRepository.sumNumberOfOpenings();
        if (totalOpenings == null) {
            totalOpenings = 0L;
        }

        LocalDate now = LocalDate.now();
        Long closedThisMonth = jobOpeningRepository.countClosedThisMonth(JobStatus.CLOSED, now.getMonthValue(),
                now.getYear());
        if (closedThisMonth == null) {
            closedThisMonth = 0L;
        }

        return new JobOpeningStatisticsResponse(activeOpenings, totalOpenings, onHold, closedThisMonth);
    }

    // Candidate-facing methods (no role validation, only active jobs)
    public List<JobOpeningResponse> getActiveJobOpeningsForCandidates() {
        return jobOpeningRepository.findByStatus(JobStatus.ACTIVE).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public JobOpeningResponse getActiveJobOpeningByIdForCandidate(Long id) {
        JobOpening jobOpening = jobOpeningRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Job opening not found"));

        if (jobOpening.getStatus() != JobStatus.ACTIVE) {
            throw new ResourceNotFoundException("Job opening is not available");
        }

        return mapToResponse(jobOpening);
    }

    private JobOpeningResponse mapToResponse(JobOpening jobOpening) {
        JobOpeningResponse response = new JobOpeningResponse();
        response.setId(jobOpening.getId());
        response.setJobTitle(jobOpening.getJobTitle());
        response.setJobName(jobOpening.getJobName());
        response.setLocation(jobOpening.getLocation());
        response.setJobType(jobOpening.getJobType().name());
        response.setWorkMode(jobOpening.getWorkMode().name());
        response.setDepartment(jobOpening.getDepartment());
        response.setApplicationDate(jobOpening.getApplicationDate());
        response.setExpectedJoiningDate(jobOpening.getExpectedJoiningDate());
        response.setNumberOfOpenings(jobOpening.getNumberOfOpenings());
        response.setStatus(jobOpening.getStatus().name());
        response.setPostedDate(jobOpening.getPostedDate());
        response.setMinExperienceYears(jobOpening.getMinExperienceYears());
        response.setRequiredSkills(jobOpening.getRequiredSkills());

        if (jobOpening.getCreatedBy() != null) {
            response.setCreatedById(jobOpening.getCreatedBy().getId());
            response.setCreatedByName(jobOpening.getCreatedBy().getName());
        }

        response.setCreatedAt(jobOpening.getCreatedAt());
        response.setUpdatedAt(jobOpening.getUpdatedAt());
        response.setClosedAt(jobOpening.getClosedAt());

        return response;
    }
}
