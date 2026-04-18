package com.dashboard.app.recruitment.dto.response;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class JobOpeningResponse {
    private Long id;
    private String jobTitle;
    private String jobName;
    private String location;
    private String jobType;
    private String workMode;
    private String department;
    private LocalDate applicationDate;
    private LocalDate expectedJoiningDate;
    private Integer numberOfOpenings;
    private String status;
    private LocalDate postedDate;
    private Integer minExperienceYears;
    private String requiredSkills;
    private Long createdById;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime closedAt;
}
