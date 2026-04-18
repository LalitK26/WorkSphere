package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponse {
    private Long id;
    private String code;
    private String name;
    private String description;
    private String summary;
    private String status;
    private LocalDate startDate;
    private LocalDate deadline;
    private Integer progressPercentage;
    private Boolean autoProgress;
    private Boolean pinned;
    private Double budget;
    private Long clientId;
    private String clientName;
    private List<Long> memberIds;
    private List<String> memberNames;
    private List<ProjectMemberDto> members;
    private Long projectAdminId;
    private String projectAdminName;
    private Long departmentId;
    private String departmentName;
    private Long categoryId;
    private String categoryName;
    private LocalDateTime createdAt;
    private Long totalTasks;
    private Long completedTasks;
}

