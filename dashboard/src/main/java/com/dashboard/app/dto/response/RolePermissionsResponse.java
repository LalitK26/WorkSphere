package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RolePermissionsResponse {
    private Long roleId;
    private String roleName;
    private List<ModulePermissionResponse> permissions;
}

