package com.dashboard.app.recruitment.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateRecruitmentUserRequest {
    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;

    private String password; // Optional - only update if provided

    @NotBlank(message = "Role is required")
    private String role; // RECRUITER or TECHNICAL_INTERVIEWER

    @NotBlank(message = "Status is required")
    private String status; // ACTIVE or INACTIVE
}

