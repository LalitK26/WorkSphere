package com.dashboard.app.recruitment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OfferLetterResponse {
    private Long id;
    private String employeeId;
    private String jobTitle;
    private String position;
    private String department;
    private String stipendAmount;
    private String ctcAmount;
    private LocalDate joiningDate;
    private LocalDate offerDate;
    private String status;
    private LocalDateTime sentAt;
    private LocalDateTime respondedAt;
    private Boolean documentsVerified;

    // Candidate details
    private Long candidateId;
    private String candidateName;
    private String candidateEmail;
    private String candidatePhone;
    private String candidateAddress;

    // Job opening details
    private Long jobOpeningId;
    private String jobName;
    private String location;
    private String jobApplied; // The exact job title from the job opening

    // Created by details
    private Long createdById;
    private String createdByName;

    // Audit fields
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
