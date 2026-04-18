package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentResponse {
    private Long id;
    private String name;
    private Long parentDepartmentId;
    private String parentDepartmentName;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}



