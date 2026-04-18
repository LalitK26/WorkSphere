package com.dashboard.app.recruitment.controller;

import com.dashboard.app.recruitment.dto.request.AssignInterviewerRequest;
import com.dashboard.app.recruitment.dto.request.RescheduleInterviewRequest;
import com.dashboard.app.recruitment.dto.request.ScheduleInterviewRequest;
import com.dashboard.app.recruitment.dto.request.LogProctoringViolationRequest;
import com.dashboard.app.recruitment.dto.response.InterviewAssignmentResponse;
import com.dashboard.app.recruitment.dto.response.InterviewResponse;
import com.dashboard.app.recruitment.dto.response.JobApplicationResponse;
import com.dashboard.app.recruitment.dto.response.ProctoringViolationResponse;
import com.dashboard.app.recruitment.dto.response.RecruitmentUserResponse;
import com.dashboard.app.recruitment.service.InterviewService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recruitment/interviews")
@CrossOrigin(origins = "*")
public class InterviewController {

    @Autowired
    private InterviewService interviewService;

    // Get shortlisted candidates (Admin/Recruiter)
    @GetMapping("/shortlisted-candidates")
    public ResponseEntity<List<InterviewAssignmentResponse>> getShortlistedCandidates(HttpServletRequest httpRequest) {
        List<InterviewAssignmentResponse> candidates = interviewService.getShortlistedCandidates(httpRequest);
        return ResponseEntity.ok(candidates);
    }

    // Assign interviewer to candidates (Admin/Recruiter)
    @PostMapping("/assign-interviewer")
    public ResponseEntity<List<InterviewAssignmentResponse>> assignInterviewer(
            @Valid @RequestBody AssignInterviewerRequest request,
            HttpServletRequest httpRequest) {
        List<InterviewAssignmentResponse> assignments = interviewService.assignInterviewer(request, httpRequest);
        return new ResponseEntity<>(assignments, HttpStatus.CREATED);
    }

    // Get assigned candidates (Technical Interviewer)
    @GetMapping("/my-assigned-candidates")
    public ResponseEntity<List<InterviewAssignmentResponse>> getMyAssignedCandidates(HttpServletRequest httpRequest) {
        List<InterviewAssignmentResponse> assignments = interviewService.getMyAssignedCandidates(httpRequest);
        return ResponseEntity.ok(assignments);
    }

    // Schedule interview (Technical Interviewer)
    @PostMapping("/schedule")
    public ResponseEntity<List<InterviewResponse>> scheduleInterview(
            @Valid @RequestBody ScheduleInterviewRequest request,
            HttpServletRequest httpRequest) {
        List<InterviewResponse> interviews = interviewService.scheduleInterview(request, httpRequest);
        return new ResponseEntity<>(interviews, HttpStatus.CREATED);
    }

    // Reschedule interview (Technical Interviewer)
    @PutMapping("/{interviewId}/reschedule")
    public ResponseEntity<InterviewResponse> rescheduleInterview(
            @PathVariable Long interviewId,
            @Valid @RequestBody RescheduleInterviewRequest request,
            HttpServletRequest httpRequest) {
        InterviewResponse interview = interviewService.rescheduleInterview(interviewId, request, httpRequest);
        return ResponseEntity.ok(interview);
    }

    // Get candidate details (Technical Interviewer/Recruiter/Admin)
    @GetMapping(value = "/candidate/{jobApplicationId}/details", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<JobApplicationResponse> getCandidateDetails(
            @PathVariable("jobApplicationId") Long jobApplicationId,
            HttpServletRequest httpRequest) {
        try {
            JobApplicationResponse details = interviewService.getCandidateDetails(jobApplicationId, httpRequest);
            return ResponseEntity.ok(details);
        } catch (Exception e) {
            // Log the error for debugging
            org.slf4j.LoggerFactory.getLogger(InterviewController.class)
                    .error("Error fetching candidate details for jobApplicationId: {}", jobApplicationId, e);
            throw e; // Re-throw to let GlobalExceptionHandler handle it
        }
    }

    // Get upcoming interviews (Candidate)
    @GetMapping("/my-upcoming-interviews")
    public ResponseEntity<List<InterviewResponse>> getMyUpcomingInterviews(HttpServletRequest httpRequest) {
        List<InterviewResponse> interviews = interviewService.getMyUpcomingInterviews(httpRequest);
        return ResponseEntity.ok(interviews);
    }

    // Get all technical interviewers (for dropdown)
    @GetMapping("/technical-interviewers")
    public ResponseEntity<List<RecruitmentUserResponse>> getTechnicalInterviewers() {
        List<RecruitmentUserResponse> interviewers = interviewService.getTechnicalInterviewers();
        return ResponseEntity.ok(interviewers);
    }

    // Get all recruiters (for dropdown)
    @GetMapping("/recruiters")
    public ResponseEntity<List<RecruitmentUserResponse>> getRecruiters() {
        List<RecruitmentUserResponse> recruiters = interviewService.getRecruiters();
        return ResponseEntity.ok(recruiters);
    }

    // Get scheduled interviews (Technical Interviewer)
    @GetMapping("/my-scheduled-interviews")
    public ResponseEntity<List<InterviewResponse>> getMyScheduledInterviews(HttpServletRequest httpRequest) {
        List<InterviewResponse> interviews = interviewService.getMyScheduledInterviews(httpRequest);
        return ResponseEntity.ok(interviews);
    }

    // Get scheduled HR interviews (Recruiter/Admin)
    @GetMapping("/my-hr-interviews")
    public ResponseEntity<org.springframework.data.domain.Page<InterviewResponse>> getMyHRInterviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            HttpServletRequest httpRequest) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<InterviewResponse> interviews = interviewService
                .getMyHRInterviews(pageable, httpRequest);
        return ResponseEntity.ok(interviews);
    }

    // Get all scheduled technical interviews (Recruiter/Admin)
    @GetMapping("/all-technical-interviews")
    public ResponseEntity<org.springframework.data.domain.Page<InterviewResponse>> getAllTechnicalInterviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            HttpServletRequest httpRequest) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<InterviewResponse> interviews = interviewService
                .getAllTechnicalInterviews(pageable, httpRequest);
        return ResponseEntity.ok(interviews);
    }

    // Generate/Regenerate Meet link for an existing interview (Technical
    // Interviewer)
    @PostMapping("/{interviewId}/generate-meet-link")
    public ResponseEntity<InterviewResponse> generateMeetLink(
            @PathVariable Long interviewId,
            HttpServletRequest httpRequest) {
        InterviewResponse interview = interviewService.generateMeetLinkForInterview(interviewId, httpRequest);
        return ResponseEntity.ok(interview);
    }

    // Submit technical round result (Technical Interviewer)
    @PostMapping("/{interviewId}/submit-result")
    public ResponseEntity<InterviewResponse> submitTechnicalResult(
            @PathVariable Long interviewId,
            @Valid @RequestBody com.dashboard.app.recruitment.dto.request.SubmitResultRequest request,
            HttpServletRequest httpRequest) {
        InterviewResponse interview = interviewService.submitTechnicalResult(interviewId, request, httpRequest);
        return ResponseEntity.ok(interview);
    }

    // Get candidates in Technical Round (Technical Interviewer)
    @GetMapping("/technical-round")
    public ResponseEntity<List<InterviewAssignmentResponse>> getTechnicalRoundCandidates(
            HttpServletRequest httpRequest) {
        List<InterviewAssignmentResponse> candidates = interviewService.getTechnicalRoundCandidates(httpRequest);
        return ResponseEntity.ok(candidates);
    }

    // Get candidates in HR Round (Recruiter/Admin)
    @GetMapping("/hr-round")
    public ResponseEntity<List<InterviewAssignmentResponse>> getHRRoundCandidates(HttpServletRequest httpRequest) {
        List<InterviewAssignmentResponse> candidates = interviewService.getHRRoundCandidates(httpRequest);
        return ResponseEntity.ok(candidates);
    }

    // Schedule HR Round interview (Recruiter/Admin)
    @PostMapping("/hr-round/schedule")
    public ResponseEntity<List<InterviewResponse>> scheduleHRInterview(
            @Valid @RequestBody com.dashboard.app.recruitment.dto.request.ScheduleHRInterviewRequest request,
            HttpServletRequest httpRequest) {
        List<InterviewResponse> interviews = interviewService.scheduleHRInterview(request, httpRequest);
        return new ResponseEntity<>(interviews, HttpStatus.CREATED);
    }

    // Log proctoring violation (Candidate)
    @PostMapping("/proctoring-violations")
    public ResponseEntity<ProctoringViolationResponse> logProctoringViolation(
            @Valid @RequestBody LogProctoringViolationRequest request) {
        ProctoringViolationResponse violation = interviewService.logProctoringViolation(request);
        return new ResponseEntity<>(violation, HttpStatus.CREATED);
    }

    // Get proctoring violations for an interview (Technical Interviewer)
    @GetMapping("/{interviewId}/proctoring-violations")
    public ResponseEntity<List<ProctoringViolationResponse>> getProctoringViolations(
            @PathVariable Long interviewId,
            HttpServletRequest httpRequest) {
        List<ProctoringViolationResponse> violations = interviewService.getProctoringViolations(interviewId,
                httpRequest);
        return ResponseEntity.ok(violations);
    }

    // Update HR Round result (Admin/Recruiter)
    @PutMapping("/{interviewId}/hr-result")
    public ResponseEntity<InterviewResponse> updateHRResult(
            @PathVariable Long interviewId,
            @RequestBody java.util.Map<String, String> request,
            HttpServletRequest httpRequest) {
        String result = request.get("result");
        InterviewResponse interview = interviewService.updateHRResult(interviewId, result, httpRequest);
        return ResponseEntity.ok(interview);
    }

    // Check if interviewer is present in meeting (Candidate)
    @GetMapping("/{interviewId}/interviewer-present")
    public ResponseEntity<Boolean> isInterviewerPresent(
            @PathVariable Long interviewId) {
        boolean isPresent = interviewService.isInterviewerPresent(interviewId);
        return ResponseEntity.ok(isPresent);
    }
}
