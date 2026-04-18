package com.dashboard.app.recruitment.service;

import com.dashboard.app.exception.UnauthorizedException;
import com.dashboard.app.recruitment.model.*;
import com.dashboard.app.recruitment.model.enums.*;
import com.dashboard.app.recruitment.repository.*;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class AdvancedAnalyticsService {

    @Autowired
    private JobApplicationRepository jobApplicationRepository;

    @Autowired
    private InterviewRepository interviewRepository;


    @Autowired
    private OfferLetterRepository offerLetterRepository;

    @Autowired
    private JobOpeningRepository jobOpeningRepository;

    @Autowired
    private RecruitmentUserRepository recruitmentUserRepository;

    @Autowired
    private JwtUtil jwtUtil;

    private RecruitmentUser getCurrentUser(HttpServletRequest request) {
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
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public Map<String, Object> getHiringActivityOverTime(String period, HttpServletRequest httpRequest) {
        getCurrentUser(httpRequest); // Auth check

        LocalDate endDate = LocalDate.now();
        LocalDate startDate;
        List<String> labels = new ArrayList<>();
        List<Map<String, Object>> applicationFlow = new ArrayList<>();
        List<Map<String, Object>> offerPerformance = new ArrayList<>();

        if ("weekly".equals(period)) {
            // Get last 4 weeks
            startDate = endDate.minusWeeks(3);
            for (int i = 0; i < 4; i++) {
                LocalDate weekStart = startDate.plusWeeks(i);
                LocalDate weekEnd = weekStart.plusDays(6);
                labels.add("Week " + (i + 1));

                // Applications
                long applications = jobApplicationRepository.findAll().stream()
                        .filter(app -> {
                            LocalDate appDate = app.getCreatedAt() != null 
                                ? app.getCreatedAt().toLocalDate() 
                                : null;
                            return appDate != null && !appDate.isBefore(weekStart) && !appDate.isAfter(weekEnd);
                        })
                        .count();

                // Screening (SHORTLISTED status)
                long screening = jobApplicationRepository.findAll().stream()
                        .filter(app -> {
                            LocalDate appDate = app.getUpdatedAt() != null 
                                ? app.getUpdatedAt().toLocalDate() 
                                : null;
                            return app.getStatus() == ApplicationStatus.SHORTLISTED 
                                && appDate != null 
                                && !appDate.isBefore(weekStart) 
                                && !appDate.isAfter(weekEnd);
                        })
                        .count();

                // Technical (interviews scheduled)
                long technical = interviewRepository.findAll().stream()
                        .filter(interview -> {
                            LocalDate interviewDate = interview.getInterviewDate();
                            return (interview.getInterviewRound() == InterviewRound.TECHNICAL 
                                || interview.getInterviewRound() == null)
                                && interviewDate != null 
                                && !interviewDate.isBefore(weekStart) 
                                && !interviewDate.isAfter(weekEnd);
                        })
                        .count();

                // HR (interviews scheduled)
                long hr = interviewRepository.findAll().stream()
                        .filter(interview -> {
                            LocalDate interviewDate = interview.getInterviewDate();
                            return interview.getInterviewRound() == InterviewRound.HR
                                && interviewDate != null 
                                && !interviewDate.isBefore(weekStart) 
                                && !interviewDate.isAfter(weekEnd);
                        })
                        .count();

                applicationFlow.add(Map.of(
                    "period", "Week " + (i + 1),
                    "applications", applications,
                    "screening", screening,
                    "technical", technical,
                    "hr", hr
                ));

                // Offers
                long offersGenerated = offerLetterRepository.findAll().stream()
                        .filter(offer -> {
                            LocalDate offerDate = offer.getCreatedAt() != null 
                                ? offer.getCreatedAt().toLocalDate() 
                                : null;
                            return offerDate != null 
                                && !offerDate.isBefore(weekStart) 
                                && !offerDate.isAfter(weekEnd);
                        })
                        .count();

                long offersAccepted = offerLetterRepository.findAll().stream()
                        .filter(offer -> {
                            LocalDate offerDate = offer.getUpdatedAt() != null 
                                ? offer.getUpdatedAt().toLocalDate() 
                                : null;
                            return offer.getStatus() == OfferStatus.ACCEPTED 
                                && offerDate != null 
                                && !offerDate.isBefore(weekStart) 
                                && !offerDate.isAfter(weekEnd);
                        })
                        .count();

                offerPerformance.add(Map.of(
                    "period", "Week " + (i + 1),
                    "generated", offersGenerated,
                    "accepted", offersAccepted
                ));
            }
        } else {
            // Monthly - last 4 months
            startDate = endDate.minusMonths(3);
            String[] monthNames = {"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
            for (int i = 0; i < 4; i++) {
                LocalDate monthStart = startDate.plusMonths(i).withDayOfMonth(1);
                LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
                int monthIdx = monthStart.getMonthValue() - 1;
                labels.add(monthNames[monthIdx]);

                long applications = jobApplicationRepository.findAll().stream()
                        .filter(app -> {
                            LocalDate appDate = app.getCreatedAt() != null 
                                ? app.getCreatedAt().toLocalDate() 
                                : null;
                            return appDate != null && !appDate.isBefore(monthStart) && !appDate.isAfter(monthEnd);
                        })
                        .count();

                long screening = jobApplicationRepository.findAll().stream()
                        .filter(app -> {
                            LocalDate appDate = app.getUpdatedAt() != null 
                                ? app.getUpdatedAt().toLocalDate() 
                                : null;
                            return app.getStatus() == ApplicationStatus.SHORTLISTED 
                                && appDate != null 
                                && !appDate.isBefore(monthStart) 
                                && !appDate.isAfter(monthEnd);
                        })
                        .count();

                long technical = interviewRepository.findAll().stream()
                        .filter(interview -> {
                            LocalDate interviewDate = interview.getInterviewDate();
                            return (interview.getInterviewRound() == InterviewRound.TECHNICAL 
                                || interview.getInterviewRound() == null)
                                && interviewDate != null 
                                && !interviewDate.isBefore(monthStart) 
                                && !interviewDate.isAfter(monthEnd);
                        })
                        .count();

                // HR (interviews scheduled)
                long hr = interviewRepository.findAll().stream()
                        .filter(interview -> {
                            LocalDate interviewDate = interview.getInterviewDate();
                            return interview.getInterviewRound() == InterviewRound.HR
                                && interviewDate != null 
                                && !interviewDate.isBefore(monthStart) 
                                && !interviewDate.isAfter(monthEnd);
                        })
                        .count();

                applicationFlow.add(Map.of(
                    "period", monthNames[monthIdx],
                    "applications", applications,
                    "screening", screening,
                    "technical", technical,
                    "hr", hr
                ));

                long offersGenerated = offerLetterRepository.findAll().stream()
                        .filter(offer -> {
                            LocalDate offerDate = offer.getCreatedAt() != null 
                                ? offer.getCreatedAt().toLocalDate() 
                                : null;
                            return offerDate != null 
                                && !offerDate.isBefore(monthStart) 
                                && !offerDate.isAfter(monthEnd);
                        })
                        .count();

                long offersAccepted = offerLetterRepository.findAll().stream()
                        .filter(offer -> {
                            LocalDate offerDate = offer.getUpdatedAt() != null 
                                ? offer.getUpdatedAt().toLocalDate() 
                                : null;
                            return offer.getStatus() == OfferStatus.ACCEPTED 
                                && offerDate != null 
                                && !offerDate.isBefore(monthStart) 
                                && !offerDate.isAfter(monthEnd);
                        })
                        .count();

                offerPerformance.add(Map.of(
                    "period", monthNames[monthIdx],
                    "generated", offersGenerated,
                    "accepted", offersAccepted
                ));
            }
        }

        return Map.of(
            "period", period,
            "labels", labels,
            "applicationFlow", applicationFlow,
            "offerPerformance", offerPerformance
        );
    }

    public Map<String, Object> getRecruiterPerformance(HttpServletRequest httpRequest) {
        getCurrentUser(httpRequest);

        List<RecruitmentUser> recruiters = recruitmentUserRepository.findAll().stream()
                .filter(user -> user.getRole() != null 
                    && (user.getRole().getType() == RecruitmentRoleType.RECRUITER 
                        || user.getRole().getType() == RecruitmentRoleType.RECRUITMENT_ADMIN))
                .collect(Collectors.toList());

        List<Map<String, Object>> performance = new ArrayList<>();

        for (RecruitmentUser recruiter : recruiters) {
            // Jobs managed by this recruiter (created by them)
            List<JobOpening> jobs = jobOpeningRepository.findAll().stream()
                    .filter(job -> job.getCreatedBy() != null && job.getCreatedBy().getId().equals(recruiter.getId()))
                    .collect(Collectors.toList());

            // Candidates for these jobs
            Set<Long> jobIds = jobs.stream().map(JobOpening::getId).collect(Collectors.toSet());
            List<JobApplication> applications = jobApplicationRepository.findAll().stream()
                    .filter(app -> jobIds.contains(app.getJobOpening().getId()))
                    .collect(Collectors.toList());

            // Total interviews conducted (HR interviews assigned to this recruiter OR for jobs created by them)
            long totalInterviews = interviewRepository.findAll().stream()
                    .filter(interview -> {
                        if (interview.getInterviewRound() != InterviewRound.HR) return false;
                        
                        // Check if assigned to this recruiter
                        if (interview.getAssignedRecruiter() != null 
                            && interview.getAssignedRecruiter().getId().equals(recruiter.getId())) {
                            return true;
                        }
                        
                        // Check if for a job created by this recruiter
                        InterviewAssignment assignment = interview.getInterviewAssignment();
                        if (assignment == null || assignment.getJobApplication() == null) return false;
                        JobOpening job = assignment.getJobApplication().getJobOpening();
                        return job.getCreatedBy() != null && job.getCreatedBy().getId().equals(recruiter.getId());
                    })
                    .count();

            // Pending interviews (scheduled but not completed)
            long pendingInterviews = interviewRepository.findAll().stream()
                    .filter(interview -> {
                        if (interview.getInterviewRound() != InterviewRound.HR) return false;
                        if (interview.getStatus() != InterviewStatus.SCHEDULED 
                            && interview.getStatus() != InterviewStatus.RESCHEDULED) return false;
                        
                        // Check if assigned to this recruiter
                        if (interview.getAssignedRecruiter() != null 
                            && interview.getAssignedRecruiter().getId().equals(recruiter.getId())) {
                            return true;
                        }
                        
                        // Check if for a job created by this recruiter
                        InterviewAssignment assignment = interview.getInterviewAssignment();
                        if (assignment == null || assignment.getJobApplication() == null) return false;
                        JobOpening job = assignment.getJobApplication().getJobOpening();
                        return job.getCreatedBy() != null && job.getCreatedBy().getId().equals(recruiter.getId());
                    })
                    .count();

            // Offers generated and accepted (created by this recruiter OR for jobs created by them)
            List<OfferLetter> offers = offerLetterRepository.findAll().stream()
                    .filter(offer -> {
                        // Check if created by this recruiter
                        if (offer.getCreatedBy() != null && offer.getCreatedBy().getId().equals(recruiter.getId())) {
                            return true;
                        }
                        // Check if for a job created by this recruiter
                        if (offer.getJobOpening() != null && offer.getJobOpening().getCreatedBy() != null) {
                            return offer.getJobOpening().getCreatedBy().getId().equals(recruiter.getId());
                        }
                        return false;
                    })
                    .collect(Collectors.toList());

            long offersGenerated = offers.size();
            long offersAccepted = offers.stream()
                    .filter(offer -> offer.getStatus() == OfferStatus.ACCEPTED)
                    .count();

            double offerSuccess = offersGenerated > 0 
                ? (double) offersAccepted / offersGenerated * 100 
                : 0.0;

            // Rejection rate
            long rejected = applications.stream()
                    .filter(app -> app.getStatus() == ApplicationStatus.REJECTED)
                    .count();
            double rejectionRate = applications.size() > 0 
                ? (double) rejected / applications.size() * 100 
                : 0.0;

            performance.add(Map.of(
                "recruiterId", recruiter.getId(),
                "recruiterName", recruiter.getName(),
                "jobs", jobs.size(),
                "candidates", applications.size(),
                "totalInterviews", totalInterviews,
                "pendingInterviews", pendingInterviews,
                "offerSuccess", Math.round(offerSuccess * 10.0) / 10.0,
                "rejectionRate", Math.round(rejectionRate * 10.0) / 10.0
            ));
        }

        return Map.of("recruiters", performance);
    }

    public Map<String, Object> getTechnicalInterviewerOverview(HttpServletRequest httpRequest) {
        getCurrentUser(httpRequest);

        List<RecruitmentUser> interviewers = recruitmentUserRepository.findAll().stream()
                .filter(user -> user.getRole() != null 
                    && user.getRole().getType() == RecruitmentRoleType.TECHNICAL_INTERVIEWER)
                .collect(Collectors.toList());

        List<Map<String, Object>> overview = new ArrayList<>();

        for (RecruitmentUser interviewer : interviewers) {
            // Total interviews conducted
            List<Interview> interviews = interviewRepository.findByInterviewerId(interviewer.getId());
            long totalInterviews = interviews.size();

            // Total candidates (unique candidates interviewed)
            long totalCandidates = interviews.stream()
                    .map(interview -> interview.getInterviewAssignment().getCandidate().getId())
                    .distinct()
                    .count();

            // Shortlisted (passed technical round)
            long shortlisted = interviews.stream()
                    .filter(interview -> interview.getResult() == InterviewResult.SHORTLISTED)
                    .count();
            double shortlistRate = totalInterviews > 0 
                ? (double) shortlisted / totalInterviews * 100 
                : 0.0;

            // Rejected
            long rejected = interviews.stream()
                    .filter(interview -> interview.getResult() == InterviewResult.REJECTED)
                    .count();
            double rejectionRate = totalInterviews > 0 
                ? (double) rejected / totalInterviews * 100 
                : 0.0;

            // Pending feedback (completed interviews without result or with PENDING result)
            long pendingFeedback = interviews.stream()
                    .filter(interview -> interview.getStatus() == InterviewStatus.COMPLETED 
                        && (interview.getResult() == null || interview.getResult() == InterviewResult.PENDING))
                    .count();

            overview.add(Map.of(
                "interviewerId", interviewer.getId(),
                "interviewerName", interviewer.getName(),
                "interviews", totalInterviews,
                "totalCandidates", totalCandidates,
                "shortlistRate", Math.round(shortlistRate * 10.0) / 10.0,
                "rejectionRate", Math.round(rejectionRate * 10.0) / 10.0,
                "pendingFeedback", pendingFeedback
            ));
        }

        return Map.of("interviewers", overview);
    }

    public Map<String, Object> getOfferAndHiringInsights(HttpServletRequest httpRequest) {
        getCurrentUser(httpRequest);

        List<OfferLetter> allOffers = offerLetterRepository.findAll();
        
        // Offer trends over time (last 4 months)
        LocalDate endDate = LocalDate.now();
        LocalDate startDate = endDate.minusMonths(3);
        String[] monthNames = {"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
        List<Map<String, Object>> offerTrends = new ArrayList<>();

        for (int i = 0; i < 4; i++) {
            LocalDate monthStart = startDate.plusMonths(i).withDayOfMonth(1);
            LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
            int monthIndex = monthStart.getMonthValue() - 1;

            long generated = allOffers.stream()
                    .filter(offer -> {
                        LocalDate offerDate = offer.getCreatedAt() != null 
                            ? offer.getCreatedAt().toLocalDate() 
                            : null;
                        return offerDate != null && !offerDate.isBefore(monthStart) && !offerDate.isAfter(monthEnd);
                    })
                    .count();

            long accepted = allOffers.stream()
                    .filter(offer -> {
                        LocalDate offerDate = offer.getUpdatedAt() != null 
                            ? offer.getUpdatedAt().toLocalDate() 
                            : null;
                        return offer.getStatus() == OfferStatus.ACCEPTED 
                            && offerDate != null 
                            && !offerDate.isBefore(monthStart) 
                            && !offerDate.isAfter(monthEnd);
                    })
                    .count();

            long rejected = allOffers.stream()
                    .filter(offer -> {
                        LocalDate offerDate = offer.getUpdatedAt() != null 
                            ? offer.getUpdatedAt().toLocalDate() 
                            : null;
                        return offer.getStatus() == OfferStatus.REJECTED 
                            && offerDate != null 
                            && !offerDate.isBefore(monthStart) 
                            && !offerDate.isAfter(monthEnd);
                    })
                    .count();

            offerTrends.add(Map.of(
                "period", monthNames[monthIndex],
                "generated", generated,
                "accepted", accepted,
                "rejected", rejected
            ));
        }

        // Summary metrics
        long totalOffers = allOffers.size();
        long acceptedOffers = allOffers.stream()
                .filter(offer -> offer.getStatus() == OfferStatus.ACCEPTED)
                .count();
        double acceptanceRate = totalOffers > 0 
            ? (double) acceptedOffers / totalOffers * 100 
            : 0.0;

        // Avg time to accept (simplified - using created/updated dates)
        double avgTimeToAccept = allOffers.stream()
                .filter(offer -> offer.getStatus() == OfferStatus.ACCEPTED 
                    && offer.getCreatedAt() != null 
                    && offer.getUpdatedAt() != null)
                .mapToLong(offer -> ChronoUnit.DAYS.between(
                    offer.getCreatedAt().toLocalDate(),
                    offer.getUpdatedAt().toLocalDate()))
                .average()
                .orElse(0.0);

        long pendingOffers = allOffers.stream()
                .filter(offer -> offer.getStatus() == OfferStatus.SENT)
                .count();

        // Drop-out points based on actual offer records
        // Offers Generated (all offers created)
        long offersGenerated = allOffers.size();
        
        // Offers Accepted
        long offersAccepted = allOffers.stream()
                .filter(offer -> offer.getStatus() == OfferStatus.ACCEPTED)
                .count();
        
        // Offers Rejected
        long offersRejected = allOffers.stream()
                .filter(offer -> offer.getStatus() == OfferStatus.REJECTED)
                .count();

        List<Map<String, Object>> dropOutPoints = new ArrayList<>();
        if (offersGenerated > 0) {
            dropOutPoints.add(Map.of(
                "category", "Offers Generated",
                "count", offersGenerated,
                "percentage", 100
            ));
            dropOutPoints.add(Map.of(
                "category", "Offers Accepted",
                "count", offersAccepted,
                "percentage", Math.round((double) offersAccepted / offersGenerated * 100)
            ));
            dropOutPoints.add(Map.of(
                "category", "Offers Rejected",
                "count", offersRejected,
                "percentage", Math.round((double) offersRejected / offersGenerated * 100)
            ));
        }

        return Map.of(
            "offerTrends", offerTrends,
            "acceptanceRate", Math.round(acceptanceRate * 10.0) / 10.0,
            "avgTimeToAccept", Math.round(avgTimeToAccept * 10.0) / 10.0,
            "pendingOffers", pendingOffers,
            "dropOutPoints", dropOutPoints
        );
    }

    public Map<String, Object> getDepartmentRoleAnalysis(HttpServletRequest httpRequest) {
        getCurrentUser(httpRequest);

        List<JobOpening> allJobs = jobOpeningRepository.findAll();
        Map<String, List<JobOpening>> jobsByDepartment = allJobs.stream()
                .collect(Collectors.groupingBy(JobOpening::getDepartment));

        List<Map<String, Object>> analysis = new ArrayList<>();

        for (Map.Entry<String, List<JobOpening>> entry : jobsByDepartment.entrySet()) {
            String department = entry.getKey();
            List<JobOpening> jobs = entry.getValue();
            
            // Active roles
            long activeRoles = jobs.stream()
                    .filter(job -> job.getStatus() == JobStatus.ACTIVE)
                    .count();

            // Applications for these jobs
            Set<Long> jobIds = jobs.stream().map(JobOpening::getId).collect(Collectors.toSet());
            List<JobApplication> applications = jobApplicationRepository.findAll().stream()
                    .filter(app -> jobIds.contains(app.getJobOpening().getId()))
                    .collect(Collectors.toList());

            // Rejection rate
            long rejected = applications.stream()
                    .filter(app -> app.getStatus() == ApplicationStatus.REJECTED)
                    .count();
            double rejectionRate = applications.size() > 0 
                ? (double) rejected / applications.size() * 100 
                : 0.0;

            // Offer acceptance
            List<OfferLetter> offers = offerLetterRepository.findAll().stream()
                    .filter(offer -> offer.getJobOpening() != null 
                        && jobIds.contains(offer.getJobOpening().getId()))
                    .collect(Collectors.toList());

            long acceptedOffers = offers.stream()
                    .filter(offer -> offer.getStatus() == OfferStatus.ACCEPTED)
                    .count();
            double offerAcceptance = offers.size() > 0 
                ? (double) acceptedOffers / offers.size() * 100 
                : 0.0;

            // Status (simplified logic)
            String status = "Normal";
            if (offerAcceptance >= 75 && rejectionRate < 45) {
                status = "Strong";
            } else if (rejectionRate > 50 || offerAcceptance < 60) {
                status = "Needs Attention";
            }

            analysis.add(Map.of(
                "department", department,
                "activeRoles", activeRoles,
                "rejectionRate", Math.round(rejectionRate * 10.0) / 10.0,
                "offerAcceptance", Math.round(offerAcceptance * 10.0) / 10.0,
                "status", status
            ));
        }

        // Summary insight cards
        Map<String, Object> topPerformer = analysis.stream()
                .max(Comparator.comparing(m -> (Double) m.get("offerAcceptance")))
                .orElse(Map.of("department", "N/A", "offerAcceptance", 0.0));

        Map<String, Object> needsAttention = analysis.stream()
                .filter(m -> "Needs Attention".equals(m.get("status")))
                .max(Comparator.comparing(m -> (Double) m.get("rejectionRate")))
                .orElse(null);

        return Map.of(
            "departments", analysis,
            "topPerformer", topPerformer != null ? topPerformer : Map.of(),
            "needsAttention", needsAttention != null ? needsAttention : Map.of()
        );
    }
}
