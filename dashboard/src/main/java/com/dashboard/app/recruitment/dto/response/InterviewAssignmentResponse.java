package com.dashboard.app.recruitment.dto.response;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
public class InterviewAssignmentResponse {
    private Long id;
    private Long interviewerId;
    private String interviewerName;
    private String interviewerEmail;
    private Long candidateId;
    private String candidateName;
    private String candidateEmail;
    private Long jobApplicationId;
    private String jobTitle;
    private Long assignedById;
    private String assignedByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Interview details (if scheduled)
    private Long interviewId;
    private LocalDate interviewDate;
    private LocalTime interviewTime;
    private String interviewStatus;
    private String meetLink; // Google Meet link (if generated)
    private String interviewRound;
    private String result;
    private String remarks;

    /** Job opening ID (for HR round). Used to disable Pass when openings are filled. */
    private Long jobOpeningId;
    /** True when all openings for this job are filled; Pass/Result should be disabled. */
    private Boolean openingsFilled;
}
