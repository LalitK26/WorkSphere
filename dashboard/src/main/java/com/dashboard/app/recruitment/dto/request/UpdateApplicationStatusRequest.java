package com.dashboard.app.recruitment.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateApplicationStatusRequest {
    @NotBlank(message = "Status is required")
    private String status; // SHORTLISTED or REJECTED
}
