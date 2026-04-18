package com.dashboard.app.recruitment.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RecruitmentLoginRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;

    @NotBlank(message = "Password is required")
    private String password;

    // User type is now optional - backend will auto-detect based on email lookup
    private String userType; // CANDIDATE, ADMIN, RECRUITER, TECHNICAL_INTERVIEWER (optional)
}

