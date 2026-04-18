package com.dashboard.app.controller;

import com.dashboard.app.dto.request.RolePermissionsRequest;
import com.dashboard.app.dto.request.RoleRequest;
import com.dashboard.app.dto.response.RolePermissionsResponse;
import com.dashboard.app.dto.response.RoleResponse;
import com.dashboard.app.service.RoleService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@CrossOrigin(origins = "*")
public class RoleController {

    @Autowired
    private RoleService roleService;

    @PostMapping
    public ResponseEntity<RoleResponse> createRole(@Valid @RequestBody RoleRequest request) {
        RoleResponse response = roleService.createRole(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoleResponse> updateRole(@PathVariable Long id, @Valid @RequestBody RoleRequest request) {
        RoleResponse response = roleService.updateRole(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoleResponse> getRoleById(@PathVariable Long id) {
        RoleResponse response = roleService.getRoleById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<RoleResponse>> getAllRoles() {
        try {
            List<RoleResponse> responses = roleService.getAllRoles();
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            // Log error at controller level for additional visibility
            org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(RoleController.class);
            logger.error("Error in getAllRoles endpoint: {}", e.getMessage(), e);
            // Re-throw to be handled by GlobalExceptionHandler
            throw e;
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRole(@PathVariable Long id) {
        roleService.deleteRole(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/permissions")
    public ResponseEntity<RolePermissionsResponse> getRolePermissions(@PathVariable Long id) {
        RolePermissionsResponse response = roleService.getRolePermissions(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/permissions")
    public ResponseEntity<RolePermissionsResponse> updateRolePermissions(
            @PathVariable Long id,
            @Valid @RequestBody RolePermissionsRequest request) {
        RolePermissionsResponse response = roleService.updateRolePermissions(id, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/permissions/reset")
    public ResponseEntity<RolePermissionsResponse> resetRolePermissions(@PathVariable Long id) {
        roleService.resetRolePermissions(id);
        RolePermissionsResponse response = roleService.getRolePermissions(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/permissions/import/{sourceRoleId}")
    public ResponseEntity<RolePermissionsResponse> importRolePermissions(
            @PathVariable Long id,
            @PathVariable Long sourceRoleId) {
        roleService.importRolePermissions(id, sourceRoleId);
        RolePermissionsResponse response = roleService.getRolePermissions(id);
        return ResponseEntity.ok(response);
    }
}

