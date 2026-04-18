package com.dashboard.app.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service to migrate absolute file paths in database to relative paths.
 * This only migrates profile-images paths as other old data is not needed.
 * Future uploads are already handled properly by FileStorageService.
 */
@Service
public class FilePathMigrationService {

    private static final Logger logger = LoggerFactory.getLogger(FilePathMigrationService.class);

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    /**
     * Migrate profile image paths in the database to relative paths.
     * Only migrates profile-images as other old data is not important.
     * Returns a summary of changes made.
     */
    @Transactional
    public Map<String, Object> migrateAllPaths() {
        Map<String, Object> result = new HashMap<>();
        int totalUpdated = 0;

        // Only migrate profile images from users table (if profile_image column exists)
        int usersUpdated = migrateUserProfileImages();
        result.put("users_profile_images", usersUpdated);
        totalUpdated += usersUpdated;

        // Migrate profile images from employees table (if exists)
        int employeesUpdated = migrateEmployeeProfileImages();
        result.put("employees_profile_images", employeesUpdated);
        totalUpdated += employeesUpdated;

        result.put("total_updated", totalUpdated);
        result.put("status", "success");
        result.put("message", "Profile images migration completed. Total records updated: " + totalUpdated);

        logger.info("Profile images migration completed. Total records updated: {}", totalUpdated);
        return result;
    }

    /**
     * Migrate profile images in users table
     */
    private int migrateUserProfileImages() {
        int updated = 0;

        try {
            String selectSql = "SELECT id, profile_image FROM users WHERE profile_image IS NOT NULL AND profile_image != ''";
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(selectSql);
            
            for (Map<String, Object> row : rows) {
                Long id = ((Number) row.get("id")).longValue();
                String profileImage = (String) row.get("profile_image");

                String newPath = convertToRelativePath(profileImage);
                if (newPath != null && !newPath.equals(profileImage)) {
                    jdbcTemplate.update("UPDATE users SET profile_image = ? WHERE id = ?", newPath, id);
                    updated++;
                    logger.debug("Migrated user {} profile_image: {} -> {}", id, profileImage, newPath);
                }
            }
        } catch (Exception e) {
            logger.warn("Error migrating users profile images (table may not exist or no profile_image column): {}", e.getMessage());
        }

        logger.info("Migrated {} user profile images", updated);
        return updated;
    }

    /**
     * Migrate profile images in employees table
     */
    private int migrateEmployeeProfileImages() {
        int updated = 0;

        try {
            String selectSql = "SELECT id, profile_image FROM employees WHERE profile_image IS NOT NULL AND profile_image != ''";
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(selectSql);
            
            for (Map<String, Object> row : rows) {
                Long id = ((Number) row.get("id")).longValue();
                String profileImage = (String) row.get("profile_image");

                String newPath = convertToRelativePath(profileImage);
                if (newPath != null && !newPath.equals(profileImage)) {
                    jdbcTemplate.update("UPDATE employees SET profile_image = ? WHERE id = ?", newPath, id);
                    updated++;
                    logger.debug("Migrated employee {} profile_image: {} -> {}", id, profileImage, newPath);
                }
            }
        } catch (Exception e) {
            logger.warn("Error migrating employees profile images (table may not exist or no profile_image column): {}", e.getMessage());
        }

        logger.info("Migrated {} employee profile images", updated);
        return updated;
    }

    /**
     * Convert an absolute path to a relative path for profile images.
     * Examples:
     * - /opt/uploads/profile-images/file.jpg -> profile-images/file.jpg
     * - /opt/apps/dashboard-api/uploads/profile-images/file.jpg -> profile-images/file.jpg
     * - uploads/profile-images/file.jpg -> profile-images/file.jpg
     * - profile-images/file.jpg -> profile-images/file.jpg (already relative, no change)
     * - null -> null
     * - http://... -> null (external URL, skip)
     */
    private String convertToRelativePath(String path) {
        if (path == null || path.trim().isEmpty()) {
            return null;
        }

        // Skip external URLs
        if (path.startsWith("http://") || path.startsWith("https://")) {
            return null;
        }

        // Normalize path separators
        String normalized = path.replace("\\", "/");

        // Check if already a valid relative path (starts with profile-images/)
        if (normalized.startsWith("profile-images/")) {
            return path; // Already relative and valid
        }

        // Try to extract profile-images path from absolute path
        String searchPattern = "/profile-images/";
        int index = normalized.indexOf(searchPattern);
        if (index >= 0) {
            // Extract from profile-images onwards
            return normalized.substring(index + 1); // +1 to skip the leading /
        }

        // Try without leading slash
        searchPattern = "profile-images/";
        index = normalized.indexOf(searchPattern);
        if (index >= 0) {
            return normalized.substring(index);
        }

        // If starts with "uploads/", remove it and check again
        if (normalized.startsWith("uploads/")) {
            String afterUploads = normalized.substring("uploads/".length());
            if (afterUploads.startsWith("profile-images/")) {
                return afterUploads;
            }
        }

        // Could not extract relative path, return original
        logger.warn("Could not convert profile image path to relative: {}", path);
        return path;
    }

    /**
     * Preview migration without making changes.
     * Returns what would be changed for profile images only.
     */
    public Map<String, Object> previewMigration() {
        Map<String, Object> result = new HashMap<>();
        java.util.List<Map<String, String>> changes = new java.util.ArrayList<>();

        // Preview users table
        try {
            String selectSql = "SELECT id, profile_image FROM users WHERE profile_image IS NOT NULL AND profile_image != ''";
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(selectSql);
            
            for (Map<String, Object> row : rows) {
                Long id = ((Number) row.get("id")).longValue();
                String profileImage = (String) row.get("profile_image");

                String newPath = convertToRelativePath(profileImage);
                if (newPath != null && !newPath.equals(profileImage)) {
                    Map<String, String> change = new HashMap<>();
                    change.put("table", "users");
                    change.put("id", id.toString());
                    change.put("column", "profile_image");
                    change.put("old_value", profileImage);
                    change.put("new_value", newPath);
                    changes.add(change);
                }
            }
        } catch (Exception e) {
            logger.warn("Error previewing users: {}", e.getMessage());
        }

        // Preview employees table
        try {
            String selectSql = "SELECT id, profile_image FROM employees WHERE profile_image IS NOT NULL AND profile_image != ''";
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(selectSql);
            
            for (Map<String, Object> row : rows) {
                Long id = ((Number) row.get("id")).longValue();
                String profileImage = (String) row.get("profile_image");

                String newPath = convertToRelativePath(profileImage);
                if (newPath != null && !newPath.equals(profileImage)) {
                    Map<String, String> change = new HashMap<>();
                    change.put("table", "employees");
                    change.put("id", id.toString());
                    change.put("column", "profile_image");
                    change.put("old_value", profileImage);
                    change.put("new_value", newPath);
                    changes.add(change);
                }
            }
        } catch (Exception e) {
            logger.warn("Error previewing employees: {}", e.getMessage());
        }

        result.put("changes_to_be_made", changes);
        result.put("total_changes", changes.size());
        result.put("status", "preview");
        result.put("message", "This is a preview for profile-images only. Use POST /migrate to apply changes.");

        return result;
    }
}
