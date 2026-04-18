package com.dashboard.app.recruitment.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RecruitmentRoleRequest {
    @NotBlank(message = "Role name is required")
    private String name;

    private String type;
    private String description;
}

