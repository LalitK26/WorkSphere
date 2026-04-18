package com.dashboard.app.dto.request;

import lombok.Data;

@Data
public class ModulePermissionRequest {
    private String module;
    private String add; // All, None
    private String view; // All, Added, Owned, Added & Owned, None
    private String update; // All, Added, Owned, Added & Owned, None
    private String delete; // All, Added, None
}

