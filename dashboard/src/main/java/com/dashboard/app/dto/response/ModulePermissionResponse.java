package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModulePermissionResponse {
    private String module;
    private String add;
    private String view;
    private String update;
    private String delete;
}

