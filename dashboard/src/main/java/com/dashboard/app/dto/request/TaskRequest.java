package com.dashboard.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TaskRequest {
    @NotBlank(message = "Task title is required")
    private String title;

    private String description;
    private String code;
    private Long assignedToId; // Kept for backward compatibility
    private java.util.List<Long> assignedToIds; // New field for multiple assignees
    private Long projectId;
    private Long milestoneId;
    private Long categoryId;
    private LocalDate startDate;
    private LocalDate dueDate;
    private Double estimatedHours;
    private String status;
    private String priority;
    private Boolean pinned;
}

