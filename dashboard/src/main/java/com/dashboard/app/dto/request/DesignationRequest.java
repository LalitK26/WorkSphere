package com.dashboard.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DesignationRequest {
    @NotBlank(message = "Designation name is required")
    private String name;

    private Long parentDesignationId;
    private String description;
}

