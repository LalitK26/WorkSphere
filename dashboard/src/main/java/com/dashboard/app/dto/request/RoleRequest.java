package com.dashboard.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class RoleRequest {
    @NotBlank(message = "Role name is required")
    private String name;

    private String type;
    private String description;
    private List<Long> permissionIds;
    private Long importFromRoleId; // For importing permissions from another role
}

