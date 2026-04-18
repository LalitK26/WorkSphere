package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DesignationResponse {
    private Long id;
    private String name;
    private Long parentDesignationId;
    private String parentDesignationName;
    private String description;
    private LocalDateTime createdAt;
}

