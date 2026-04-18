package com.dashboard.app.recruitment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecruitmentUserResponse {
    private Long id;
    private String name;
    private String email;
    private Long roleId;
    private String roleName;
    private String roleType;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

