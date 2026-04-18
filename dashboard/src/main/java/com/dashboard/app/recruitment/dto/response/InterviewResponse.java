package com.dashboard.app.recruitment.dto.response;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
public class InterviewResponse {
    private Long id;
    private Long interviewAssignmentId;
    private Long interviewerId;
    private String interviewerName;
    private String interviewerEmail;
    private Long candidateId;
    private String candidateName;
    private String candidateEmail;
    private Long jobApplicationId;
    private String jobTitle;
    private LocalDate interviewDate;
    private LocalTime interviewTime;
    private String status;
    private String notes;
    private String meetLink;
    private String interviewRound;
    private String result;
    private String remarks;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    /** Job opening ID (for HR round). Used to disable Pass when openings are filled. */
    private Long jobOpeningId;
    /** True when all openings for this job are filled; Pass/Result should be disabled. */
    private Boolean openingsFilled;
}
