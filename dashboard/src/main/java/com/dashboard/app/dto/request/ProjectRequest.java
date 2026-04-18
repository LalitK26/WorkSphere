package com.dashboard.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class ProjectRequest {
    @NotBlank(message = "Project name is required")
    private String name;

    private String code;
    private String description;
    private String summary;
    private LocalDate startDate;
    private LocalDate deadline;
    private Long clientId;
    private List<Long> memberIds;
    private Long projectAdminId;
    private Long departmentId;
    private Long categoryId;
    private Boolean pinned;
    private Boolean autoProgress;
    private Double budget;
    private String status;
    private Integer progressPercentage;
}

