package com.dashboard.app.recruitment.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class JobApplicationResponse {
    private Long id;
    private Long jobOpeningId;
    private String jobTitle;
    private String companyName;
    private Long candidateId;
    private String candidateName;
    private String candidateEmail;
    private String candidatePhone;
    private String status;
    private String coverLetter;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Candidate profile information
    private String resumeUrl;
    private String portfolioUrl;
    private Integer fresherYears;
    private Integer experiencedYears;
    private String experienceLetterUrl;

    // Latest technical interview outcome (if any)
    private String technicalInterviewResult;
    private String technicalInterviewRemarks;

    // Stage-specific completion status
    private String screeningStatus;
    private String technicalStatus;
    private String hrStatus;
    private String offerStatus;
}
