package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TaskResponse {
    private Long id;
    private String code;
    private String title;
    private String description;
    private String status;
    private String priority;
    private Boolean pinned;
    private Long assignedToId; // Primary assignee for backward compatibility
    private String assignedToName;
    private String assignedToAvatar;
    private java.util.List<Long> assignedToIds; // Multiple assignees
    private java.util.List<String> assignedToNames; // Names of all assignees
    private Long projectId;
    private String projectName;
    private Long categoryId;
    private String categoryName;
    private LocalDate startDate;
    private LocalDate dueDate;
    private LocalDateTime completedOn;
    private Double estimatedHours;
    private Double hoursLogged;
    private String attachmentName;
    private String attachmentUrl;
    private LocalDateTime createdAt;
    private Long createdById;
    private String createdByName;
    private String createdByAvatar;
}

