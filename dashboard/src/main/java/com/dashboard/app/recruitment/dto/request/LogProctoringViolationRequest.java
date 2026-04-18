package com.dashboard.app.recruitment.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class LogProctoringViolationRequest {
    @NotNull(message = "Interview ID is required")
    private Long interviewId;

    @NotBlank(message = "Violation type is required")
    private String violationType;

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Timestamp is required")
    private java.time.LocalDateTime timestamp;
}
