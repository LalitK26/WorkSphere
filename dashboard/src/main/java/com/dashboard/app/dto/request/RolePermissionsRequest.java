package com.dashboard.app.dto.request;

import lombok.Data;
import java.util.List;

@Data
public class RolePermissionsRequest {
    private List<ModulePermissionRequest> permissions;
}

