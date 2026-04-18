package com.dashboard.app.controller;

import com.dashboard.app.service.FilePathMigrationService;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Controller for file path migration operations.
 * These endpoints are protected and should only be accessible by admins.
 * 
 * Usage:
 * 1. First call GET /api/admin/file-migration/preview to see what will be changed
 * 2. Then call POST /api/admin/file-migration/migrate to apply the changes
 */
@RestController
@RequestMapping("/api/admin/file-migration")
@CrossOrigin(origins = "*")
public class FilePathMigrationController {

    private static final Logger logger = LoggerFactory.getLogger(FilePathMigrationController.class);

    @Autowired
    private FilePathMigrationService migrationService;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * Preview the migration without making changes.
     * Shows what paths would be converted.
     */
    @GetMapping("/preview")
    public ResponseEntity<Map<String, Object>> previewMigration(HttpServletRequest request) {
        validateAdminAccess(request);
        
        logger.info("Preview migration requested by admin");
        Map<String, Object> result = migrationService.previewMigration();
        return ResponseEntity.ok(result);
    }

    /**
     * Execute the migration to convert absolute paths to relative paths.
     * This operation is idempotent - running it multiple times is safe.
     */
    @PostMapping("/migrate")
    public ResponseEntity<Map<String, Object>> executeMigration(HttpServletRequest request) {
        validateAdminAccess(request);
        
        logger.info("Migration execution requested by admin");
        Map<String, Object> result = migrationService.migrateAllPaths();
        return ResponseEntity.ok(result);
    }

    /**
     * Validate that the requesting user is an admin.
     */
    private void validateAdminAccess(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authorization header is missing or invalid");
        }

        String token = authHeader.substring(7);
        String role;
        try {
            role = jwtUtil.extractRole(token);
        } catch (Exception e) {
            logger.error("Failed to extract role from token", e);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
        }

        // Only allow ADMIN, RECRUITMENT_ADMIN, or SUPERADMIN
        if (!"ADMIN".equals(role) && !"RECRUITMENT_ADMIN".equals(role) && !"SUPERADMIN".equals(role)) {
            logger.warn("Non-admin user attempted to access migration endpoint. Role: {}", role);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only administrators can access this endpoint");
        }
    }
}
