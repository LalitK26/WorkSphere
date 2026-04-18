package com.dashboard.app.recruitment.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateJobOpeningRequest {
    @NotBlank(message = "Job title is required")
    private String jobTitle;

    @NotBlank(message = "Job name is required")
    private String jobName;

    @NotBlank(message = "Location is required")
    private String location;

    @NotBlank(message = "Job type is required")
    private String jobType; // FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, TEMPORARY

    @NotBlank(message = "Work mode is required")
    private String workMode; // REMOTE, ONSITE, HYBRID

    @NotBlank(message = "Department is required")
    private String department;

    @NotNull(message = "Application date is required")
    private LocalDate applicationDate;

    private LocalDate expectedJoiningDate;

    @NotNull(message = "Number of openings is required")
    private Integer numberOfOpenings = 0;

    private Integer minExperienceYears = 0;

    private String requiredSkills;
}
