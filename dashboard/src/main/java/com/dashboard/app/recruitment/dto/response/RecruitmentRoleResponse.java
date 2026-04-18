package com.dashboard.app.recruitment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecruitmentRoleResponse {
    private Long id;
    private String name;
    private String type;
    private String description;
    private Long memberCount; // Count of recruitment users with this role
    private LocalDateTime createdAt;
}

