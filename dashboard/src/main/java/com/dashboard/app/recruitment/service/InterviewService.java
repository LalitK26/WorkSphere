package com.dashboard.app.recruitment.service;

import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.exception.UnauthorizedException;
import com.dashboard.app.recruitment.dto.request.AssignInterviewerRequest;
import com.dashboard.app.recruitment.dto.request.LogProctoringViolationRequest;
import com.dashboard.app.recruitment.dto.request.RescheduleInterviewRequest;
import com.dashboard.app.recruitment.dto.request.ScheduleHRInterviewRequest;
import com.dashboard.app.recruitment.dto.request.ScheduleInterviewRequest;
import com.dashboard.app.recruitment.dto.request.SubmitResultRequest;
import com.dashboard.app.recruitment.dto.response.InterviewAssignmentResponse;
import com.dashboard.app.recruitment.dto.response.InterviewResponse;
import com.dashboard.app.recruitment.dto.response.JobApplicationResponse;
import com.dashboard.app.recruitment.dto.response.ProctoringViolationResponse;
import com.dashboard.app.recruitment.model.*;
import com.dashboard.app.recruitment.model.enums.ApplicationStatus;
import com.dashboard.app.recruitment.model.enums.InterviewResult;
import com.dashboard.app.recruitment.model.enums.InterviewRound;
import com.dashboard.app.recruitment.model.enums.InterviewStatus;
import com.dashboard.app.recruitment.model.enums.JobStatus;
import com.dashboard.app.recruitment.model.enums.RecruitmentRoleType;
import com.dashboard.app.recruitment.repository.*;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;

@Service
@Transactional
public class InterviewService {

    @Autowired
    private InterviewAssignmentRepository interviewAssignmentRepository;

    @Autowired
    private InterviewRepository interviewRepository;

    @Autowired
    private RecruitmentUserRepository recruitmentUserRepository;

    @Autowired
    private CandidateRepository candidateRepository;

    @Autowired
    private JobApplicationRepository jobApplicationRepository;

    @Autowired
    private JobOpeningRepository jobOpeningRepository;

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private CacheManager cacheManager;

    @Autowired
    private RecruitmentEmailService recruitmentEmailService;

    @Autowired
    private com.dashboard.app.meeting.service.MeetingSignalingService meetingSignalingService;

    // Counter for generating unique violation IDs
    private final AtomicLong violationIdCounter = new AtomicLong(System.currentTimeMillis());

    private RecruitmentUser getCurrentRecruitmentUser(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Authorization header is missing or invalid");
        }

        String token = authHeader.substring(7);
        String role = jwtUtil.extractRole(token);

        if (role == null || role.equals("CANDIDATE")) {
            throw new UnauthorizedException("Access denied. Only recruitment users can access this resource.");
        }

        Long userId = jwtUtil.extractUserId(token);
        return recruitmentUserRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private Candidate getCurrentCandidate(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Authorization header is missing or invalid");
        }

        String token = authHeader.substring(7);
        String role = jwtUtil.extractRole(token);

        if (role == null || !role.equals("CANDIDATE")) {
            throw new UnauthorizedException("Access denied. Only candidates can access this resource.");
        }

        Long userId = jwtUtil.extractUserId(token);
        return candidateRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found"));
    }

    // Get shortlisted candidates for Admin/Recruiter
    public List<InterviewAssignmentResponse> getShortlistedCandidates(HttpServletRequest httpRequest) {
        getCurrentRecruitmentUser(httpRequest); // Verify user is authenticated
        String role = jwtUtil.extractRole(httpRequest.getHeader("Authorization").substring(7));

        if (!role.equals("RECRUITMENT_ADMIN") && !role.equals("RECRUITER")) {
            throw new UnauthorizedException(
                    "Access denied. Only admins and recruiters can view shortlisted candidates.");
        }

        // Get all applications with SHORTLISTED status
        List<JobApplication> shortlistedApplications = jobApplicationRepository.findAll().stream()
                .filter(app -> app.getStatus() == ApplicationStatus.SHORTLISTED)
                .collect(Collectors.toList());

        // Get existing assignments for these applications
        List<InterviewAssignment> existingAssignments = interviewAssignmentRepository.findAll();

        return shortlistedApplications.stream()
                .map(app -> {
                    InterviewAssignmentResponse response = new InterviewAssignmentResponse();
                    response.setCandidateId(app.getCandidate().getId());
                    response.setCandidateName(app.getCandidate().getFullName());
                    response.setCandidateEmail(app.getCandidate().getEmail());
                    response.setJobApplicationId(app.getId());
                    response.setJobTitle(app.getJobOpening().getJobTitle());

                    // Check if already assigned
                    InterviewAssignment existing = existingAssignments.stream()
                            .filter(ia -> ia.getJobApplication().getId().equals(app.getId()))
                            .findFirst()
                            .orElse(null);

                    if (existing != null) {
                        response.setId(existing.getId());
                        response.setInterviewerId(existing.getInterviewer().getId());
                        response.setInterviewerName(existing.getInterviewer().getName());
                        response.setInterviewerEmail(existing.getInterviewer().getEmail());
                    }

                    return response;
                })
                .collect(Collectors.toList());
    }

    // Assign interviewer to candidates (Admin/Recruiter)
    public List<InterviewAssignmentResponse> assignInterviewer(AssignInterviewerRequest request,
            HttpServletRequest httpRequest) {
        RecruitmentUser assignedBy = getCurrentRecruitmentUser(httpRequest);
        String role = jwtUtil.extractRole(httpRequest.getHeader("Authorization").substring(7));

        if (!role.equals("RECRUITMENT_ADMIN") && !role.equals("RECRUITER")) {
            throw new UnauthorizedException("Access denied. Only admins and recruiters can assign interviewers.");
        }

        RecruitmentUser interviewer = recruitmentUserRepository.findById(request.getInterviewerId())
                .orElseThrow(() -> new ResourceNotFoundException("Interviewer not found"));

        // Verify interviewer has TECHNICAL_INTERVIEWER role
        if (interviewer.getRole().getType() != RecruitmentRoleType.TECHNICAL_INTERVIEWER) {
            throw new BadRequestException("Selected user is not a technical interviewer");
        }

        List<InterviewAssignment> assignments = request.getCandidateApplicationIds().stream()
                .map(appId -> {
                    JobApplication application = jobApplicationRepository.findById(appId)
                            .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + appId));

                    if (application.getJobOpening() != null
                            && application.getJobOpening().getStatus() == JobStatus.CLOSED) {
                        throw new BadRequestException(
                                "Cannot assign interviewer: the job for application " + appId + " is closed.");
                    }

                    // Verify application is shortlisted
                    if (application.getStatus() != ApplicationStatus.SHORTLISTED) {
                        throw new BadRequestException("Application " + appId + " is not shortlisted");
                    }

                    // Check if assignment already exists
                    InterviewAssignment existing = interviewAssignmentRepository
                            .findByInterviewerIdAndCandidateIdAndJobApplicationId(
                                    interviewer.getId(),
                                    application.getCandidate().getId(),
                                    application.getId())
                            .orElse(null);

                    if (existing != null) {
                        return existing;
                    }

                    InterviewAssignment assignment = new InterviewAssignment();
                    assignment.setInterviewer(interviewer);
                    assignment.setCandidate(application.getCandidate());
                    assignment.setJobApplication(application);
                    assignment.setAssignedBy(assignedBy);
                    return interviewAssignmentRepository.save(assignment);
                })
                .collect(Collectors.toList());

        return assignments.stream()
                .map(this::mapAssignmentToResponse)
                .collect(Collectors.toList());
    }

    // Get assigned candidates for Technical Interviewer
    public List<InterviewAssignmentResponse> getMyAssignedCandidates(HttpServletRequest httpRequest) {
        RecruitmentUser interviewer = getCurrentRecruitmentUser(httpRequest);
        String role = jwtUtil.extractRole(httpRequest.getHeader("Authorization").substring(7));

        if (!role.equals("TECHNICAL_INTERVIEWER")) {
            throw new UnauthorizedException("Access denied. Only technical interviewers can view assigned candidates.");
        }

        List<InterviewAssignment> assignments = interviewAssignmentRepository
                .findByInterviewerIdWithDetails(interviewer.getId());

        return assignments.stream()
                .map(this::mapAssignmentToResponse)
                .collect(Collectors.toList());
    }

    // Schedule interview (Technical Interviewer)
    public List<InterviewResponse> scheduleInterview(ScheduleInterviewRequest request, HttpServletRequest httpRequest) {
        RecruitmentUser interviewer = getCurrentRecruitmentUser(httpRequest);
        String role = jwtUtil.extractRole(httpRequest.getHeader("Authorization").substring(7));

        if (!role.equals("TECHNICAL_INTERVIEWER")) {
            throw new UnauthorizedException("Access denied. Only technical interviewers can schedule interviews.");
        }

        // Validate date is not in the past
        if (request.getInterviewDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Interview date cannot be in the past");
        }

        List<Interview> interviews = request.getInterviewAssignmentIds().stream()
                .map(assignmentId -> {
                    InterviewAssignment assignment = interviewAssignmentRepository.findById(assignmentId)
                            .orElseThrow(() -> new ResourceNotFoundException(
                                    "Interview assignment not found: " + assignmentId));

                    // Verify assignment belongs to current interviewer
                    if (!assignment.getInterviewer().getId().equals(interviewer.getId())) {
                        throw new UnauthorizedException("Access denied. This assignment does not belong to you.");
                    }

                    Interview interview = new Interview();
                    interview.setInterviewAssignment(assignment);
                    interview.setInterviewDate(request.getInterviewDate());
                    interview.setInterviewTime(request.getInterviewTime());
                    interview.setStatus(InterviewStatus.SCHEDULED);
                    interview.setNotes(request.getNotes());
                    // Note: Meet link will be generated manually by the technical interviewer
                    // using the generate-meet-link endpoint

                    Interview savedInterview = interviewRepository.save(interview);

                    // Send email notification to candidate (Technical interview)
                    try {
                        Candidate candidate = assignment.getJobApplication().getCandidate();
                        String first = candidate.getFirstName() != null ? candidate.getFirstName().trim() : "";
                        String last = candidate.getLastName() != null ? candidate.getLastName().trim() : "";
                        String candidateName = (first + " " + last).trim();
                        if (candidateName.isEmpty())
                            candidateName = candidate.getEmail();
                        String jobTitle = assignment.getJobApplication().getJobOpening().getJobTitle();
                        String interviewerName = interviewer.getName() != null ? interviewer.getName()
                                : interviewer.getEmail();
                        String interviewRound = savedInterview.getInterviewRound() != null
                                ? savedInterview.getInterviewRound().name()
                                : "Technical";

                        recruitmentEmailService.sendTechnicalInterviewScheduled(
                                candidate.getEmail(),
                                candidateName,
                                jobTitle,
                                savedInterview.getInterviewDate(),
                                savedInterview.getInterviewTime(),
                                interviewerName,
                                interviewRound);
                    } catch (Exception e) {
                        // Log error but don't fail interview scheduling if email fails
                        org.slf4j.LoggerFactory.getLogger(InterviewService.class)
                                .error("Failed to send interview scheduled email for interview: {}",
                                        savedInterview.getId(), e);
                    }

                    return savedInterview;
                })
                .collect(Collectors.toList());

        return interviews.stream()
                .map(this::mapInterviewToResponse)
                .collect(Collectors.toList());
    }

    // Reschedule interview (Technical Interviewer/Recruiter)
    public InterviewResponse rescheduleInterview(Long interviewId, RescheduleInterviewRequest request,
            HttpServletRequest httpRequest) {
        RecruitmentUser currentUser = getCurrentRecruitmentUser(httpRequest);
        String role = jwtUtil.extractRole(httpRequest.getHeader("Authorization").substring(7));

        if (!role.equals("TECHNICAL_INTERVIEWER") && !role.equals("RECRUITER") && !role.equals("RECRUITMENT_ADMIN")) {
            throw new UnauthorizedException(
                    "Access denied. Only technical interviewers, recruiters, and admins can reschedule interviews.");
        }

        // Validate date is not in the past
        if (request.getInterviewDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Interview date cannot be in the past");
        }

        // Find the interview
        Interview interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found: " + interviewId));

        // Verify interview belongs to current user based on role and interview round
        if (role.equals("TECHNICAL_INTERVIEWER")) {
            // Technical interviewer can only reschedule their own technical interviews
            if (interview.getInterviewRound() != null && interview.getInterviewRound() == InterviewRound.HR) {
                throw new UnauthorizedException(
                        "Access denied. Technical interviewers cannot reschedule HR round interviews.");
            }
            if (!interview.getInterviewAssignment().getInterviewer().getId().equals(currentUser.getId())) {
                throw new UnauthorizedException("Access denied. This interview does not belong to you.");
            }
        } else if (role.equals("RECRUITER")) {
            // Recruiter can only reschedule HR interviews where they are involved
            if (interview.getInterviewRound() == null || interview.getInterviewRound() != InterviewRound.HR) {
                throw new UnauthorizedException("Access denied. Recruiters can only reschedule HR round interviews.");
            }
            // Verify recruiter is the job opening creator, assignedBy, or assignedRecruiter
            JobApplication jobApplication = interview.getInterviewAssignment().getJobApplication();
            Long createdById = jobApplication.getJobOpening().getCreatedBy() != null
                    ? jobApplication.getJobOpening().getCreatedBy().getId()
                    : null;
            Long assignedById = interview.getInterviewAssignment().getAssignedBy() != null
                    ? interview.getInterviewAssignment().getAssignedBy().getId()
                    : null;
            Long assignedRecruiterId = interview.getAssignedRecruiter() != null
                    ? interview.getAssignedRecruiter().getId()
                    : null;

            if (!currentUser.getId().equals(createdById) && !currentUser.getId().equals(assignedById)
                    && !currentUser.getId().equals(assignedRecruiterId)) {
                throw new UnauthorizedException("Access denied. This HR interview is not assigned to you.");
            }
        }
        // RECRUITMENT_ADMIN has access to all interviews

        // Store old date and time for email notification
        LocalDate oldDate = interview.getInterviewDate();
        LocalTime oldTime = interview.getInterviewTime();

        // Update interview date and time
        interview.setInterviewDate(request.getInterviewDate());
        interview.setInterviewTime(request.getInterviewTime());
        interview.setStatus(InterviewStatus.RESCHEDULED);
        // Note: If rescheduling, the existing meet link is cleared so a new one can be
        // generated
        interview.setMeetLink(null);

        interview = interviewRepository.save(interview);

        // Send email notification to candidate
        try {
            InterviewAssignment assignment = interview.getInterviewAssignment();
            Candidate candidate = assignment.getJobApplication().getCandidate();
            String candidateName = (candidate.getFirstName() != null ? candidate.getFirstName() : "")
                    + (candidate.getLastName() != null ? " " + candidate.getLastName() : "").trim();
            if (candidateName.isEmpty()) {
                candidateName = candidate.getEmail();
            }
            String jobTitle = assignment.getJobApplication().getJobOpening().getJobTitle();
            RecruitmentUser interviewer = assignment.getInterviewer();
            String interviewerName = interviewer.getName() != null ? interviewer.getName() : interviewer.getEmail();
            String interviewRound = interview.getInterviewRound() != null
                    ? interview.getInterviewRound().name()
                    : "Technical";

            recruitmentEmailService.sendInterviewRescheduled(
                    candidate.getEmail(),
                    candidateName,
                    jobTitle,
                    oldDate,
                    oldTime,
                    interview.getInterviewDate(),
                    interview.getInterviewTime(),
                    interviewerName,
                    interviewRound);
        } catch (Exception e) {
            // Log error but don't fail interview rescheduling if email fails
            org.slf4j.LoggerFactory.getLogger(InterviewService.class)
                    .error("Failed to send interview rescheduled email for interview: {}", interview.getId(), e);
        }

        return mapInterviewToResponse(interview);
    }

    // Get candidate details (Technical Interviewer/Recruiter/Admin)
    public JobApplicationResponse getCandidateDetails(Long jobApplicationId, HttpServletRequest httpRequest) {
        RecruitmentUser currentUser = getCurrentRecruitmentUser(httpRequest);
        String authHeader = httpRequest.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new UnauthorizedException("Authorization header is missing or invalid");
        }
        String role = jwtUtil.extractRole(authHeader.substring(7));

        if (!role.equals("TECHNICAL_INTERVIEWER") && !role.equals("RECRUITER") && !role.equals("RECRUITMENT_ADMIN")) {
            throw new UnauthorizedException(
                    "Access denied. Only technical interviewers, recruiters, and admins can view candidate details.");
        }

        // Find the job application with proper eager loading
        JobApplication application = jobApplicationRepository.findByIdWithDetails(jobApplicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Job application not found: " + jobApplicationId));

        // Ensure application data is loaded
        if (application.getJobOpening() == null) {
            throw new ResourceNotFoundException("Job opening not found for application: " + jobApplicationId);
        }
        if (application.getCandidate() == null) {
            throw new ResourceNotFoundException("Candidate not found for application: " + jobApplicationId);
        }

        // Verify access based on role
        if (role.equals("TECHNICAL_INTERVIEWER")) {
            // Technical interviewer can only view candidates that are actually assigned to
            // them.
            // As long as an InterviewAssignment exists for this interviewer + candidate +
            // job application,
            // allow viewing details regardless of whether an interview has been scheduled
            // yet
            // or what round the future interview may belong to.
            interviewAssignmentRepository
                    .findByInterviewerIdAndCandidateIdAndJobApplicationId(
                            currentUser.getId(),
                            application.getCandidate().getId(),
                            application.getId())
                    .orElseThrow(() -> new UnauthorizedException(
                            "Access denied. You are not assigned to interview this candidate."));
        }
        // RECRUITER and RECRUITMENT_ADMIN can view candidate details without additional
        // restrictions
        // Access to the Interviews section already ensures they can only see interviews
        // assigned to them

        // Map to response with profile information
        JobApplicationResponse response = new JobApplicationResponse();
        response.setId(application.getId());
        response.setJobOpeningId(application.getJobOpening().getId());
        response.setJobTitle(application.getJobOpening().getJobTitle() != null
                ? application.getJobOpening().getJobTitle()
                : "N/A");
        response.setCompanyName(application.getJobOpening().getJobName() != null
                ? application.getJobOpening().getJobName()
                : "N/A");
        response.setCandidateId(application.getCandidate().getId());
        response.setCandidateName(application.getCandidate().getFullName() != null
                ? application.getCandidate().getFullName()
                : "N/A");
        response.setCandidateEmail(application.getCandidate().getEmail() != null
                ? application.getCandidate().getEmail()
                : "N/A");
        response.setCandidatePhone(application.getCandidate().getPhoneNumber() != null
                ? application.getCandidate().getPhoneNumber()
                : "N/A");
        response.setStatus(application.getStatus() != null ? application.getStatus().name() : "UNKNOWN");
        response.setCoverLetter(application.getCoverLetter());
        response.setCreatedAt(application.getCreatedAt());
        response.setUpdatedAt(application.getUpdatedAt());

        // Add candidate profile information if available
        try {
            CandidateProfile profile = candidateProfileRepository.findByCandidateId(application.getCandidate().getId())
                    .orElse(null);
            if (profile != null) {
                response.setResumeUrl(profile.getResumeUrl());
                response.setPortfolioUrl(profile.getPortfolioUrl());
                response.setFresherYears(profile.getFresherYears());
                response.setExperiencedYears(profile.getExperiencedYears());
            }
        } catch (Exception e) {
            // If profile fetch fails, continue without profile data
            // Log the error but don't fail the entire request
            System.err.println("Error fetching candidate profile: " + e.getMessage());
        }

        // Add latest technical interview result/remarks (if any) so HR can see them
        try {
            List<Interview> interviews = interviewRepository.findByCandidateId(application.getCandidate().getId());

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
                response.setTechnicalInterviewResult(
                        latestTechnicalInterview.getResult() != null ? latestTechnicalInterview.getResult().name()
                                : null);
                response.setTechnicalInterviewRemarks(latestTechnicalInterview.getRemarks());
            }
        } catch (Exception e) {
            System.err.println("Error fetching technical interview details: " + e.getMessage());
        }

        return response;
    }

    // Get upcoming interviews for Candidate
    public List<InterviewResponse> getMyUpcomingInterviews(HttpServletRequest httpRequest) {
        Candidate candidate = getCurrentCandidate(httpRequest);

        List<Interview> interviews = interviewRepository.findByCandidateIdAndDateFrom(
                candidate.getId(), LocalDate.now());

        return interviews.stream()
                .map(this::mapInterviewToResponse)
                .collect(Collectors.toList());
    }

    // Get scheduled interviews for Technical Interviewer
    public List<InterviewResponse> getMyScheduledInterviews(HttpServletRequest httpRequest) {
        RecruitmentUser interviewer = getCurrentRecruitmentUser(httpRequest);
        String role = jwtUtil.extractRole(httpRequest.getHeader("Authorization").substring(7));

        if (!role.equals("TECHNICAL_INTERVIEWER")) {
            throw new UnauthorizedException(
                    "Access denied. Only technical interviewers can view scheduled interviews.");
        }

        List<Interview> interviews = interviewRepository.findByInterviewerId(interviewer.getId());

        return interviews.stream()
                .map(this::mapInterviewToResponse)
                .collect(Collectors.toList());
    }

    // Get scheduled HR interviews for Recruiter/Admin
    public List<InterviewResponse> getMyHRInterviews(HttpServletRequest httpRequest) {
        RecruitmentUser currentUser = getCurrentRecruitmentUser(httpRequest);
        String role = jwtUtil.extractRole(httpRequest.getHeader("Authorization").substring(7));

        if (!role.equals("RECRUITER") && !role.equals("RECRUITMENT_ADMIN")) {
            throw new UnauthorizedException(
                    "Access denied. Only recruiters and admins can view HR interviews.");
        }

        List<Interview> interviews;

        if (role.equals("RECRUITMENT_ADMIN")) {
            // Admins can see ALL HR interviews
            interviews = interviewRepository.findAllHRInterviews();
        } else {
            // Recruiters can only see HR interviews they're involved in
            interviews = interviewRepository.findHRInterviewsByRecruiterId(currentUser.getId());
        }

        return interviews.stream()
                .map(this::mapInterviewToResponse)
                .collect(Collectors.toList());
    }

    // Get scheduled HR interviews for Recruiter/Admin (Paginated)
    public org.springframework.data.domain.Page<InterviewResponse> getMyHRInterviews(
            org.springframework.data.domain.Pageable pageable, HttpServletRequest httpRequest) {
        RecruitmentUser currentUser = getCurrentRecruitmentUser(httpRequest);
        String role = jwtUtil.extractRole(httpRequest.getHeader("Authorization").substring(7));

        if (!role.equals("RECRUITER") && !role.equals("RECRUITMENT_ADMIN")) {
            throw new UnauthorizedException(
                    "Access denied. Only recruiters and admins can view HR interviews.");
        }

        org.springframework.data.domain.Page<Interview> interviews;

        if (role.equals("RECRUITMENT_ADMIN")) {
            // Admins can see ALL HR interviews
            interviews = interviewRepository.findAllHRInterviews(pageable);
        } else {
            // Recruiters can only see HR interviews they're involved in
            interviews = interviewRepository.findHRInterviewsByRecruiterId(currentUser.getId(), pageable);
        }

        return interviews.map(this::mapInterviewToResponse);
    }

    // Get all scheduled technical interviews (Recruiter/Admin)
    public List<InterviewResponse> getAllTechnicalInterviews(HttpServletRequest httpRequest) {
        getCurrentRecruitmentUser(httpRequest);
        String role = jwtUtil.extractRole(httpRequest.getHeader("Authorization").substring(7));

        if (!role.equals("RECRUITER") && !role.equals("RECRUITMENT_ADMIN")) {
            throw new UnauthorizedException(
                    "Access denied. Only recruiters and admins can view all technical interviews.");
        }

        // Get all technical interviews (not HR round) with SCHEDULED or RESCHEDULED
        // status
        List<Interview> interviews = interviewRepository.findAll().stream()
                .filter(interview -> {
                    // Filter for technical interviews only (null or TECHNICAL round)
                    boolean isTechnical = interview.getInterviewRound() == null ||
                            interview.getInterviewRound() == InterviewRound.TECHNICAL;
                    // Filter for scheduled or rescheduled status
                    boolean isScheduled = interview.getStatus() == InterviewStatus.SCHEDULED ||
                            interview.getStatus() == InterviewStatus.RESCHEDULED;
                    return isTechnical && isScheduled;
                })
                .collect(Collectors.toList());

        return interviews.stream()
                .map(this::mapInterviewToResponse)
                .collect(Collectors.toList());
    }

    // Get all scheduled technical interviews (Recruiter/Admin) (Paginated)
    public org.springframework.data.domain.Page<InterviewResponse> getAllTechnicalInterviews(
            org.springframework.data.domain.Pageable pageable, HttpServletRequest httpRequest) {
        getCurrentRecruitmentUser(httpRequest);
        String role = jwtUtil.extractRole(httpRequest.getHeader("Authorization").substring(7));

        if (!role.equals("RECRUITER") && !role.equals("RECRUITMENT_ADMIN")) {
            throw new UnauthorizedException(
                    "Access denied. Only recruiters and admins can view all technical interviews.");
        }

        return interviewRepository.findAllTechnicalInterviews(pageable)
                .map(this::mapInterviewToResponse);
    }

    // Generate Meet link for an existing interview (Technical
    // Interviewer/Recruiter)
    // Note: External meeting links (Google Meet) have been removed. Use WebRTC for
    // conducting interviews.
    public InterviewResponse generateMeetLinkForInterview(Long interviewId, HttpServletRequest httpRequest) {
        RecruitmentUser currentUser = getCurrentRecruitmentUser(httpRequest);
        String role = jwtUtil.extractRole(httpRequest.getHeader("Authorization").substring(7));

        if (!role.equals("TECHNICAL_INTERVIEWER") && !role.equals("RECRUITER") && !role.equals("RECRUITMENT_ADMIN")) {
            throw new UnauthorizedException(
                    "Access denied. Only technical interviewers, recruiters, and admins can manage interviews.");
        }

        // Find the interview
        Interview interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found: " + interviewId));

        // Verify interview belongs to current user based on role and interview round
        if (role.equals("TECHNICAL_INTERVIEWER")) {
            // Technical interviewer can only manage their own technical interviews
            if (interview.getInterviewRound() != null && interview.getInterviewRound() == InterviewRound.HR) {
                throw new UnauthorizedException(
                        "Access denied. Technical interviewers cannot manage HR round interviews.");
            }
            if (!interview.getInterviewAssignment().getInterviewer().getId().equals(currentUser.getId())) {
                throw new UnauthorizedException("Access denied. This interview does not belong to you.");
            }
        } else if (role.equals("RECRUITER")) {
            // Recruiter can only manage HR interviews where they are involved
            if (interview.getInterviewRound() == null || interview.getInterviewRound() != InterviewRound.HR) {
                throw new UnauthorizedException("Access denied. Recruiters can only manage HR round interviews.");
            }
            // Verify recruiter is the job opening creator, assignedBy, or assignedRecruiter
            JobApplication jobApplication = interview.getInterviewAssignment().getJobApplication();
            Long createdById = jobApplication.getJobOpening().getCreatedBy() != null
                    ? jobApplication.getJobOpening().getCreatedBy().getId()
                    : null;
            Long assignedById = interview.getInterviewAssignment().getAssignedBy() != null
                    ? interview.getInterviewAssignment().getAssignedBy().getId()
                    : null;
            Long assignedRecruiterId = interview.getAssignedRecruiter() != null
                    ? interview.getAssignedRecruiter().getId()
                    : null;

            if (!currentUser.getId().equals(createdById) && !currentUser.getId().equals(assignedById)
                    && !currentUser.getId().equals(assignedRecruiterId)) {
                throw new UnauthorizedException("Access denied. This HR interview is not assigned to you.");
            }
        }
        // RECRUITMENT_ADMIN has access to all interviews

        // External meeting links (Google Meet) are no longer supported
        // Interviews should be conducted using the built-in WebRTC meeting system
        throw new BadRequestException(
                "External meeting link generation is no longer supported. " +
                        "Please use the built-in WebRTC video conferencing system to conduct interviews.");
    }

    // Get all technical interviewers (for Admin/Recruiter dropdown)
    public List<com.dashboard.app.recruitment.dto.response.RecruitmentUserResponse> getTechnicalInterviewers() {
        return recruitmentUserRepository.findAll().stream()
                .filter(user -> user.getRole().getType() == RecruitmentRoleType.TECHNICAL_INTERVIEWER
                        && user.getStatus() == com.dashboard.app.model.enums.UserStatus.ACTIVE)
                .map(user -> {
                    com.dashboard.app.recruitment.dto.response.RecruitmentUserResponse response = new com.dashboard.app.recruitment.dto.response.RecruitmentUserResponse();
                    response.setId(user.getId());
                    response.setName(user.getName());
                    response.setEmail(user.getEmail());
                    response.setRoleType(user.getRole().getType().name());
                    return response;
                })
                .collect(Collectors.toList());
    }

    // Get all recruiters (for dropdown)
    public List<com.dashboard.app.recruitment.dto.response.RecruitmentUserResponse> getRecruiters() {
        List<RecruitmentUser> allUsers = recruitmentUserRepository.findAll();
        System.out.println("Total recruitment users in database: " + allUsers.size());

        List<com.dashboard.app.recruitment.dto.response.RecruitmentUserResponse> recruiters = allUsers.stream()
                .filter(user -> {
                    if (user.getRole() == null) {
                        System.out.println("User " + user.getId() + " has null role");
                        return false;
                    }
                    if (user.getRole().getType() == null) {
                        System.out.println("User " + user.getId() + " role has null type");
                        return false;
                    }
                    System.out.println("User: " + user.getName() + ", Role: " + user.getRole().getType() + ", Status: "
                            + user.getStatus());
                    return user.getRole().getType() == RecruitmentRoleType.RECRUITER
                            && user.getStatus() == com.dashboard.app.model.enums.UserStatus.ACTIVE;
                })
                .map(user -> {
                    com.dashboard.app.recruitment.dto.response.RecruitmentUserResponse response = new com.dashboard.app.recruitment.dto.response.RecruitmentUserResponse();
                    response.setId(user.getId());
                    response.setName(user.getName());
                    response.setEmail(user.getEmail());
                    response.setRoleType(user.getRole().getType().name());
                    return response;
                })
                .collect(Collectors.toList());

        System.out.println("Filtered recruiters count: " + recruiters.size());
        return recruiters;
    }

    private InterviewAssignmentResponse mapAssignmentToResponse(InterviewAssignment assignment) {
        InterviewAssignmentResponse response = new InterviewAssignmentResponse();
        response.setId(assignment.getId());
        response.setInterviewerId(assignment.getInterviewer().getId());
        response.setInterviewerName(assignment.getInterviewer().getName());
        response.setInterviewerEmail(assignment.getInterviewer().getEmail());
        response.setCandidateId(assignment.getCandidate().getId());
        response.setCandidateName(assignment.getCandidate().getFullName());
        response.setCandidateEmail(assignment.getCandidate().getEmail());
        response.setJobApplicationId(assignment.getJobApplication().getId());
        response.setJobTitle(assignment.getJobApplication().getJobOpening().getJobTitle());
        response.setAssignedById(assignment.getAssignedBy().getId());
        response.setAssignedByName(assignment.getAssignedBy().getName());
        response.setCreatedAt(assignment.getCreatedAt());
        response.setUpdatedAt(assignment.getUpdatedAt());

        // Fetch the latest interview for this assignment
        List<Interview> interviews = interviewRepository.findByInterviewAssignmentId(assignment.getId());
        if (!interviews.isEmpty()) {
            // Get the most recent interview (by creation date)
            Interview latestInterview = interviews.stream()
                    .max((i1, i2) -> i1.getCreatedAt().compareTo(i2.getCreatedAt()))
                    .orElse(interviews.get(0));
            response.setInterviewId(latestInterview.getId());
            response.setInterviewDate(latestInterview.getInterviewDate());
            response.setInterviewTime(latestInterview.getInterviewTime());
            response.setInterviewStatus(latestInterview.getStatus().name());
            response.setMeetLink(latestInterview.getMeetLink());
            response.setInterviewRound(
                    latestInterview.getInterviewRound() != null ? latestInterview.getInterviewRound().name()
                            : "TECHNICAL");
            response.setResult(latestInterview.getResult() != null ? latestInterview.getResult().name() : "PENDING");
            response.setRemarks(latestInterview.getRemarks());
        }

        return response;
    }

    private InterviewResponse mapInterviewToResponse(Interview interview) {
        InterviewResponse response = new InterviewResponse();
        response.setId(interview.getId());
        response.setInterviewAssignmentId(interview.getInterviewAssignment().getId());

        // For HR round interviews, show the recruiter/admin (prefer job opening
        // creator, fallback to assignedBy)
        // For technical round interviews, show the technical interviewer
        RecruitmentUser interviewer;
        if (interview.getInterviewRound() != null && interview.getInterviewRound() == InterviewRound.HR) {
            // HR round: use the recruiter/admin who created the job opening (most
            // appropriate HR interviewer)
            // Fallback to assignedBy if createdBy is not available
            InterviewAssignment assignment = interview.getInterviewAssignment();
            JobApplication jobApplication = assignment.getJobApplication();
            if (jobApplication != null && jobApplication.getJobOpening() != null
                    && jobApplication.getJobOpening().getCreatedBy() != null) {
                interviewer = jobApplication.getJobOpening().getCreatedBy();
            } else {
                // Fallback to assignedBy (recruiter/admin who assigned the technical
                // interviewer)
                interviewer = assignment.getAssignedBy();
            }
        } else {
            // Technical round: use the technical interviewer from the assignment
            interviewer = interview.getInterviewAssignment().getInterviewer();
        }

        response.setInterviewerId(interviewer.getId());
        response.setInterviewerName(interviewer.getName());
        response.setInterviewerEmail(interviewer.getEmail());
        response.setCandidateId(interview.getInterviewAssignment().getCandidate().getId());
        response.setCandidateName(interview.getInterviewAssignment().getCandidate().getFullName());
        response.setCandidateEmail(interview.getInterviewAssignment().getCandidate().getEmail());
        response.setJobApplicationId(interview.getInterviewAssignment().getJobApplication().getId());
        response.setJobTitle(interview.getInterviewAssignment().getJobApplication().getJobOpening().getJobTitle());
        response.setInterviewDate(interview.getInterviewDate());
        response.setInterviewTime(interview.getInterviewTime());
        response.setStatus(interview.getStatus().name());
        response.setNotes(interview.getNotes());
        response.setMeetLink(interview.getMeetLink());
        response.setInterviewRound(
                interview.getInterviewRound() != null ? interview.getInterviewRound().name() : "TECHNICAL");
        response.setResult(interview.getResult() != null ? interview.getResult().name() : "PENDING");
        response.setRemarks(interview.getRemarks());
        response.setCreatedAt(interview.getCreatedAt());
        response.setUpdatedAt(interview.getUpdatedAt());

        if (interview.getInterviewRound() != null && interview.getInterviewRound() == InterviewRound.HR) {
            JobOpening job = interview.getInterviewAssignment().getJobApplication().getJobOpening();
            response.setJobOpeningId(job.getId());
            Long hrPassed = jobApplicationRepository.countByJobOpeningIdAndStatus(job.getId(),
                    ApplicationStatus.ACCEPTED);
            long passed = hrPassed != null ? hrPassed : 0L;
            int total = job.getNumberOfOpenings() != null ? job.getNumberOfOpenings() : 0;
            boolean filled = job.getStatus() == JobStatus.CLOSED || (total > 0 && passed >= total);
            response.setOpeningsFilled(filled);
        }

        return response;
    }

    // Submit technical round result (Technical Interviewer)
    public InterviewResponse submitTechnicalResult(Long interviewId, SubmitResultRequest request,
            HttpServletRequest httpRequest) {
        RecruitmentUser interviewer = getCurrentRecruitmentUser(httpRequest);
        String role = jwtUtil.extractRole(httpRequest.getHeader("Authorization").substring(7));

        if (!role.equals("TECHNICAL_INTERVIEWER")) {
            throw new UnauthorizedException("Access denied. Only technical interviewers can submit results.");
        }

        Interview interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found: " + interviewId));

        if (!interview.getInterviewAssignment().getInterviewer().getId().equals(interviewer.getId())) {
            throw new UnauthorizedException("Access denied. This interview does not belong to you.");
        }

        // Set the interview round to TECHNICAL if not already set
        if (interview.getInterviewRound() == null) {
            interview.setInterviewRound(InterviewRound.TECHNICAL);
        }

        // Set the result
        interview.setResult(request.getResult());
        interview.setRemarks(request.getRemarks());

        // If result is SHORTLISTED, validate and assign recruiter
        if (request.getResult() == InterviewResult.SHORTLISTED) {
            if (request.getAssignedRecruiterId() == null) {
                throw new BadRequestException("Assigned recruiter is required when shortlisting a candidate");
            }

            RecruitmentUser recruiter = recruitmentUserRepository.findById(request.getAssignedRecruiterId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Recruiter not found: " + request.getAssignedRecruiterId()));

            // Verify the user is actually a recruiter
            if (recruiter.getRole().getType() != RecruitmentRoleType.RECRUITER) {
                throw new BadRequestException("Selected user is not a recruiter");
            }

            interview.setAssignedRecruiter(recruiter);

            JobApplication application = interview.getInterviewAssignment().getJobApplication();
            application.setStatus(ApplicationStatus.SHORTLISTED);
            application.setTechnicalStatus("PASSED"); // Update technical stage status
            jobApplicationRepository.save(application);
        }

        // Mark interview as COMPLETED since result has been submitted
        interview.setStatus(InterviewStatus.COMPLETED);

        // If result is REJECTED, update application status and send rejection email
        if (request.getResult() == InterviewResult.REJECTED) {
            JobApplication application = interview.getInterviewAssignment().getJobApplication();
            application.setStatus(ApplicationStatus.REJECTED);
            application.setTechnicalStatus("REJECTED"); // Update technical stage status
            jobApplicationRepository.save(application);

            // Send rejection email
            try {
                Candidate candidate = application.getCandidate();
                String first = candidate.getFirstName() != null ? candidate.getFirstName().trim() : "";
                String last = candidate.getLastName() != null ? candidate.getLastName().trim() : "";
                String candidateName = (first + " " + last).trim();
                if (candidateName.isEmpty())
                    candidateName = candidate.getEmail();
                String jobTitle = application.getJobOpening().getJobTitle();

                recruitmentEmailService.sendRejectionEmail(candidate.getEmail(), candidateName, jobTitle);
            } catch (Exception e) {
                org.slf4j.LoggerFactory.getLogger(InterviewService.class)
                        .error("Failed to send rejection email for interview: {}", interview.getId(), e);
            }
        }

        interview = interviewRepository.save(interview);

        return mapInterviewToResponse(interview);
    }

    // Get candidates in Technical Round (Technical Interviewer)
    public List<InterviewAssignmentResponse> getTechnicalRoundCandidates(HttpServletRequest httpRequest) {
        RecruitmentUser interviewer = getCurrentRecruitmentUser(httpRequest);
        String role = jwtUtil.extractRole(httpRequest.getHeader("Authorization").substring(7));

        if (!role.equals("TECHNICAL_INTERVIEWER")) {
            throw new UnauthorizedException(
                    "Access denied. Only technical interviewers can view technical round candidates.");
        }

        List<InterviewAssignment> assignments = interviewAssignmentRepository
                .findByInterviewerIdWithDetails(interviewer.getId());

        return assignments.stream()
                .filter(assignment -> {
                    List<Interview> interviews = interviewRepository.findByInterviewAssignmentId(assignment.getId());
                    if (interviews.isEmpty()) {
                        return true;
                    }
                    Interview latestInterview = interviews.stream()
                            .max((i1, i2) -> i1.getCreatedAt().compareTo(i2.getCreatedAt()))
                            .orElse(interviews.get(0));
                    return latestInterview.getInterviewRound() == null
                            || latestInterview.getInterviewRound() == InterviewRound.TECHNICAL;
                })
                .map(this::mapAssignmentToResponse)
                .collect(Collectors.toList());
    }

    // Get candidates in HR Round (Recruiter/Admin)
    public List<InterviewAssignmentResponse> getHRRoundCandidates(HttpServletRequest httpRequest) {
        RecruitmentUser currentUser = getCurrentRecruitmentUser(httpRequest);
        String role = jwtUtil.extractRole(httpRequest.getHeader("Authorization").substring(7));

        if (!role.equals("RECRUITMENT_ADMIN") && !role.equals("RECRUITER")) {
            throw new UnauthorizedException("Access denied. Only admins and recruiters can view HR round candidates.");
        }

        List<InterviewAssignment> allAssignments = interviewAssignmentRepository.findAll();

        return allAssignments.stream()
                .filter(assignment -> {
                    List<Interview> interviews = interviewRepository.findByInterviewAssignmentId(assignment.getId());
                    if (interviews.isEmpty()) {
                        return false;
                    }
                    return interviews.stream()
                            .anyMatch(interview -> {
                                boolean isShortlisted = interview.getInterviewRound() != null &&
                                        interview.getResult() != null &&
                                        interview.getInterviewRound() == InterviewRound.TECHNICAL &&
                                        interview.getResult() == InterviewResult.SHORTLISTED;

                                // If recruiter role, only show candidates assigned to them
                                if (role.equals("RECRUITER")) {
                                    return isShortlisted &&
                                            interview.getAssignedRecruiter() != null &&
                                            interview.getAssignedRecruiter().getId().equals(currentUser.getId());
                                }

                                // Admins can see all shortlisted candidates
                                return isShortlisted;
                            });
                })
                .map(this::mapAssignmentToHRRoundResponse)
                .collect(Collectors.toList());
    }

    // Custom mapper for HR Round that only shows HR interview details
    private InterviewAssignmentResponse mapAssignmentToHRRoundResponse(InterviewAssignment assignment) {
        InterviewAssignmentResponse response = new InterviewAssignmentResponse();
        response.setId(assignment.getId());
        response.setInterviewerId(assignment.getInterviewer().getId());
        response.setInterviewerName(assignment.getInterviewer().getName());
        response.setInterviewerEmail(assignment.getInterviewer().getEmail());
        response.setCandidateId(assignment.getCandidate().getId());
        response.setCandidateName(assignment.getCandidate().getFullName());
        response.setCandidateEmail(assignment.getCandidate().getEmail());
        response.setJobApplicationId(assignment.getJobApplication().getId());
        JobOpening job = assignment.getJobApplication().getJobOpening();
        response.setJobTitle(job.getJobTitle());
        response.setJobOpeningId(job.getId());
        response.setAssignedById(assignment.getAssignedBy().getId());
        response.setAssignedByName(assignment.getAssignedBy().getName());
        response.setCreatedAt(assignment.getCreatedAt());
        response.setUpdatedAt(assignment.getUpdatedAt());

        Long hrPassed = jobApplicationRepository.countByJobOpeningIdAndStatus(job.getId(), ApplicationStatus.ACCEPTED);
        long passed = hrPassed != null ? hrPassed : 0L;
        int total = job.getNumberOfOpenings() != null ? job.getNumberOfOpenings() : 0;
        boolean filled = job.getStatus() == JobStatus.CLOSED || (total > 0 && passed >= total);
        response.setOpeningsFilled(filled);

        // Fetch interviews for this assignment
        List<Interview> interviews = interviewRepository.findByInterviewAssignmentId(assignment.getId());

        // Look for HR Round interview specifically
        Interview hrInterview = interviews.stream()
                .filter(i -> i.getInterviewRound() != null && i.getInterviewRound() == InterviewRound.HR)
                .max((i1, i2) -> i1.getCreatedAt().compareTo(i2.getCreatedAt()))
                .orElse(null);

        if (hrInterview != null) {
            // HR interview exists - show its details
            response.setInterviewId(hrInterview.getId());
            response.setInterviewDate(hrInterview.getInterviewDate());
            response.setInterviewTime(hrInterview.getInterviewTime());
            response.setInterviewStatus(hrInterview.getStatus().name());
            response.setMeetLink(hrInterview.getMeetLink());
            response.setInterviewRound("HR");
            response.setResult(hrInterview.getResult() != null ? hrInterview.getResult().name() : "PENDING");
            response.setRemarks(hrInterview.getRemarks());
        } else {
            // No HR interview scheduled yet - show pending status
            response.setInterviewRound("HR");
            response.setResult("PENDING");
            response.setInterviewStatus("PENDING");
        }

        return response;
    }

    // Schedule HR Round interview (Recruiter/Admin)
    public List<InterviewResponse> scheduleHRInterview(ScheduleHRInterviewRequest request,
            HttpServletRequest httpRequest) {
        getCurrentRecruitmentUser(httpRequest);
        String role = jwtUtil.extractRole(httpRequest.getHeader("Authorization").substring(7));

        if (!role.equals("RECRUITMENT_ADMIN") && !role.equals("RECRUITER")) {
            throw new UnauthorizedException("Access denied. Only admins and recruiters can schedule HR interviews.");
        }

        if (request.getInterviewDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Interview date cannot be in the past");
        }

        List<Interview> interviews = request.getCandidateApplicationIds().stream()
                .map(appId -> {
                    JobApplication application = jobApplicationRepository.findById(appId)
                            .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + appId));

                    if (application.getJobOpening() != null
                            && application.getJobOpening().getStatus() == JobStatus.CLOSED) {
                        throw new BadRequestException(
                                "Cannot schedule HR interview: the job for application " + appId + " is closed.");
                    }

                    List<InterviewAssignment> assignments = interviewAssignmentRepository.findByJobApplicationId(appId);

                    if (assignments.isEmpty()) {
                        throw new ResourceNotFoundException("No interview assignment found for application: " + appId);
                    }

                    InterviewAssignment assignment = assignments.get(0);

                    Interview interview = new Interview();
                    interview.setInterviewAssignment(assignment);
                    interview.setInterviewDate(request.getInterviewDate());
                    interview.setInterviewTime(request.getInterviewTime());
                    interview.setStatus(InterviewStatus.SCHEDULED);
                    interview.setNotes(request.getNotes());
                    interview.setInterviewRound(InterviewRound.HR);
                    interview.setResult(InterviewResult.PENDING);

                    // Copy the assignedRecruiter from the shortlisted technical interview
                    // This ensures the recruiter assigned by the technical interviewer can see this
                    // HR interview
                    List<Interview> technicalInterviews = interviewRepository
                            .findShortlistedTechnicalInterviewByJobApplicationId(appId);
                    if (!technicalInterviews.isEmpty()) {
                        Interview technicalInterview = technicalInterviews.get(0);
                        if (technicalInterview.getAssignedRecruiter() != null) {
                            interview.setAssignedRecruiter(technicalInterview.getAssignedRecruiter());
                        }
                    }

                    Interview savedInterview = interviewRepository.save(interview);

                    // Send email notification to candidate (HR interview)
                    try {
                        Candidate candidate = assignment.getJobApplication().getCandidate();
                        String first = candidate.getFirstName() != null ? candidate.getFirstName().trim() : "";
                        String last = candidate.getLastName() != null ? candidate.getLastName().trim() : "";
                        String candidateName = (first + " " + last).trim();
                        if (candidateName.isEmpty())
                            candidateName = candidate.getEmail();
                        String jobTitle = assignment.getJobApplication().getJobOpening().getJobTitle();
                        RecruitmentUser interviewer = assignment.getInterviewer();
                        String interviewerName = interviewer != null && interviewer.getName() != null
                                ? interviewer.getName()
                                : (interviewer != null ? interviewer.getEmail() : "HR Team");
                        String interviewRound = "HR";

                        recruitmentEmailService.sendHrInterviewScheduled(
                                candidate.getEmail(),
                                candidateName,
                                jobTitle,
                                savedInterview.getInterviewDate(),
                                savedInterview.getInterviewTime(),
                                interviewerName,
                                interviewRound);
                    } catch (Exception e) {
                        // Log error but don't fail interview scheduling if email fails
                        org.slf4j.LoggerFactory.getLogger(InterviewService.class)
                                .error("Failed to send HR interview scheduled email for interview: {}",
                                        savedInterview.getId(), e);
                    }

                    return savedInterview;
                })
                .collect(Collectors.toList());

        return interviews.stream()
                .map(this::mapInterviewToResponse)
                .collect(Collectors.toList());
    }

    // Log proctoring violation (Candidate) - stored in cache
    public ProctoringViolationResponse logProctoringViolation(LogProctoringViolationRequest request) {
        interviewRepository.findById(request.getInterviewId())
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found: " + request.getInterviewId()));

        // Get or create cache for this interview
        Cache cache = cacheManager.getCache("proctoring");
        if (cache == null) {
            throw new RuntimeException("Proctoring cache not configured");
        }

        String cacheKey = "interview:" + request.getInterviewId();
        List<ProctoringViolationResponse> violations = getViolationsFromCache(cache, cacheKey);

        // Create violation response
        ProctoringViolationResponse violation = new ProctoringViolationResponse();
        violation.setId(violationIdCounter.incrementAndGet());
        violation.setInterviewId(request.getInterviewId());
        violation.setViolationType(request.getViolationType());
        violation.setDescription(request.getDescription());
        violation.setTimestamp(request.getTimestamp());
        violation.setCreatedAt(java.time.LocalDateTime.now());

        // Add to list and store back in cache
        violations.add(violation);
        cache.put(cacheKey, violations);

        return violation;
    }

    // Get proctoring violations for an interview (Technical Interviewer) - from
    // cache
    public List<ProctoringViolationResponse> getProctoringViolations(Long interviewId, HttpServletRequest httpRequest) {
        RecruitmentUser currentUser = getCurrentRecruitmentUser(httpRequest);
        String role = jwtUtil.extractRole(httpRequest.getHeader("Authorization").substring(7));

        // Allow TECHNICAL_INTERVIEWER, RECRUITMENT_ADMIN, and RECRUITER to view
        // proctoring violations
        if (!role.equals("TECHNICAL_INTERVIEWER") && !role.equals("RECRUITMENT_ADMIN") && !role.equals("RECRUITER")) {
            throw new UnauthorizedException(
                    "Access denied. Only technical interviewers, recruiters, and admins can view proctoring violations.");
        }

        // Find the interview
        Interview interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found: " + interviewId));

        // For TECHNICAL_INTERVIEWER, verify interview belongs to them
        // For RECRUITMENT_ADMIN and RECRUITER, allow access to all interviews
        if (role.equals("TECHNICAL_INTERVIEWER")) {
            if (interview.getInterviewAssignment() == null ||
                    interview.getInterviewAssignment().getInterviewer() == null ||
                    !interview.getInterviewAssignment().getInterviewer().getId().equals(currentUser.getId())) {
                throw new UnauthorizedException("Access denied. This interview does not belong to you.");
            }
        }

        // Get violations from cache
        Cache cache = cacheManager.getCache("proctoring");
        if (cache == null) {
            return Collections.emptyList();
        }

        String cacheKey = "interview:" + interviewId;
        List<ProctoringViolationResponse> violations = getViolationsFromCache(cache, cacheKey);

        // Sort by timestamp descending (most recent first)
        return violations.stream()
                .sorted((v1, v2) -> v2.getTimestamp().compareTo(v1.getTimestamp()))
                .collect(Collectors.toList());
    }

    // Helper method to get violations from cache
    private List<ProctoringViolationResponse> getViolationsFromCache(Cache cache, String cacheKey) {
        Cache.ValueWrapper wrapper = cache.get(cacheKey);
        if (wrapper != null && wrapper.get() != null) {
            @SuppressWarnings("unchecked")
            List<ProctoringViolationResponse> violations = (List<ProctoringViolationResponse>) wrapper.get();
            return new ArrayList<>(violations); // Return a copy to avoid concurrent modification
        }
        return new ArrayList<>();
    }

    // Update HR Round result (Admin/Recruiter)
    public InterviewResponse updateHRResult(Long interviewId, String result, HttpServletRequest httpRequest) {
        RecruitmentUser currentUser = getCurrentRecruitmentUser(httpRequest);
        String role = jwtUtil.extractRole(httpRequest.getHeader("Authorization").substring(7));

        if (!role.equals("RECRUITMENT_ADMIN") && !role.equals("RECRUITER")) {
            throw new UnauthorizedException("Access denied. Only admins and recruiters can update HR results.");
        }

        Interview interview = interviewRepository.findById(interviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Interview not found: " + interviewId));

        // Verify this is an HR round interview
        if (interview.getInterviewRound() == null || interview.getInterviewRound() != InterviewRound.HR) {
            throw new BadRequestException("Only HR round interview results can be updated using this endpoint");
        }

        // Verify recruiter access - must be job opening creator, assignedBy, or
        // assignedRecruiter
        if (role.equals("RECRUITER")) {
            JobApplication jobApplication = interview.getInterviewAssignment().getJobApplication();
            Long createdById = jobApplication.getJobOpening().getCreatedBy() != null
                    ? jobApplication.getJobOpening().getCreatedBy().getId()
                    : null;
            Long assignedById = interview.getInterviewAssignment().getAssignedBy() != null
                    ? interview.getInterviewAssignment().getAssignedBy().getId()
                    : null;
            Long assignedRecruiterId = interview.getAssignedRecruiter() != null
                    ? interview.getAssignedRecruiter().getId()
                    : null;

            if (!currentUser.getId().equals(createdById) && !currentUser.getId().equals(assignedById)
                    && !currentUser.getId().equals(assignedRecruiterId)) {
                throw new UnauthorizedException("Access denied. This HR interview is not assigned to you.");
            }
        }

        // Verify result is not already set (prevent duplicate updates)
        if (interview.getResult() != InterviewResult.PENDING) {
            throw new BadRequestException("HR result has already been recorded for this interview");
        }

        JobApplication application = interview.getInterviewAssignment().getJobApplication();
        JobOpening job = application.getJobOpening();
        Long jobId = job.getId();

        if ("SHORTLISTED".equals(result)) {
            // Enforce capacity and auto-closure: lock job, check openings, then update
            JobOpening lockedJob = jobOpeningRepository.findByIdWithLock(jobId)
                    .orElseThrow(() -> new ResourceNotFoundException("Job opening not found"));

            if (lockedJob.getStatus() == JobStatus.CLOSED) {
                throw new BadRequestException(
                        "This job is closed. HR pass and shortlisting are no longer allowed for this position.");
            }

            int totalOpenings = lockedJob.getNumberOfOpenings() != null ? lockedJob.getNumberOfOpenings() : 0;
            Long hrPassedCount = jobApplicationRepository.countByJobOpeningIdAndStatus(jobId,
                    ApplicationStatus.ACCEPTED);
            if (hrPassedCount == null) {
                hrPassedCount = 0L;
            }
            if (hrPassedCount >= totalOpenings) {
                throw new BadRequestException("All openings for this job are already filled.");
            }

            interview.setResult(InterviewResult.SHORTLISTED);
            interview.setStatus(InterviewStatus.COMPLETED);
            application.setStatus(ApplicationStatus.ACCEPTED);
            application.setHrStatus("PASSED"); // Update HR stage status
            jobApplicationRepository.save(application);
            interview = interviewRepository.save(interview);

            long newCount = hrPassedCount + 1;
            if (newCount >= totalOpenings) {
                lockedJob.setStatus(JobStatus.CLOSED);
                lockedJob.setClosedAt(LocalDateTime.now());
                jobOpeningRepository.save(lockedJob);
            }
        } else if ("REJECTED".equals(result)) {
            interview.setResult(InterviewResult.REJECTED);
            interview.setStatus(InterviewStatus.COMPLETED);
            application.setStatus(ApplicationStatus.REJECTED);
            application.setHrStatus("REJECTED"); // Update HR stage status
            jobApplicationRepository.save(application);
            interview = interviewRepository.save(interview);

            // Send rejection email
            try {
                Candidate candidate = application.getCandidate();
                String first = candidate.getFirstName() != null ? candidate.getFirstName().trim() : "";
                String last = candidate.getLastName() != null ? candidate.getLastName().trim() : "";
                String candidateName = (first + " " + last).trim();
                if (candidateName.isEmpty())
                    candidateName = candidate.getEmail();
                String jobTitle = application.getJobOpening().getJobTitle();

                recruitmentEmailService.sendRejectionEmail(candidate.getEmail(), candidateName, jobTitle);
            } catch (Exception e) {
                org.slf4j.LoggerFactory.getLogger(InterviewService.class)
                        .error("Failed to send rejection email for interview: {}", interview.getId(), e);
            }
        } else {
            throw new BadRequestException("Invalid result. Must be either 'SHORTLISTED' or 'REJECTED'");
        }

        return mapInterviewToResponse(interview);
    }

    /**
     * Check if an interviewer is currently present in the meeting room.
     * This is used by candidates to determine if they can join the interview.
     * 
     * @param interviewId The interview ID to check
     * @return true if at least one interviewer is present, false otherwise
     */
    public boolean isInterviewerPresent(Long interviewId) {
        return meetingSignalingService.isInterviewerPresent(String.valueOf(interviewId));
    }
}
