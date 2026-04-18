package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoleResponse {
    private Long id;
    private String name;
    private String type;
    private String description;
    private List<Long> permissionIds;
    private List<String> permissionNames;
    private Long memberCount;
    private LocalDateTime createdAt;
}

