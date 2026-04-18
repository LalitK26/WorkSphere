-- Schema SQL for WorkSphere Dashboard
-- This file creates all database tables manually
-- Uses IF NOT EXISTS to safely run multiple times without errors
-- 
-- IMPORTANT: Make sure the database 'dashboard' exists before running this script
-- CREATE DATABASE IF NOT EXISTS dashboard;
-- USE dashboard;
--
-- EXECUTION NOTES:
-- 1. Tables are created in dependency order (parent tables before child tables)
-- 2. All foreign key constraints are properly ordered
-- 3. Indexes are created at the end for better performance
-- 4. This script can be run multiple times safely (IF NOT EXISTS prevents errors)

-- Create roles table
CREATE TABLE IF NOT EXISTS `roles` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL UNIQUE,
    `type` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255),
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create permissions table
CREATE TABLE IF NOT EXISTS `permissions` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL UNIQUE,
    `module` VARCHAR(255),
    `description` VARCHAR(255),
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create role_permissions join table
CREATE TABLE IF NOT EXISTS `role_permissions` (
    `role_id` BIGINT NOT NULL,
    `permission_id` BIGINT NOT NULL,
    PRIMARY KEY (`role_id`, `permission_id`),
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create designations table
CREATE TABLE IF NOT EXISTS `designations` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `parent_designation_id` BIGINT,
    `description` VARCHAR(255),
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    FOREIGN KEY (`parent_designation_id`) REFERENCES `designations`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create departments table
CREATE TABLE IF NOT EXISTS `departments` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL UNIQUE,
    `parent_department_id` BIGINT,
    `description` VARCHAR(255),
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    FOREIGN KEY (`parent_department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create users table
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `first_name` VARCHAR(255) NOT NULL,
    `last_name` VARCHAR(255) NOT NULL,
    `employee_id` VARCHAR(255),
    `role_id` BIGINT NOT NULL,
    `designation_id` BIGINT,
    `reporting_manager_id` BIGINT,
    `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    `department` VARCHAR(255),
    `country` VARCHAR(255),
    `mobile` VARCHAR(255),
    `gender` VARCHAR(50),
    `joining_date` DATE,
    `date_of_birth` DATE,
    `language` VARCHAR(255),
    `address` TEXT,
    `about` TEXT,
    `login_allowed` BOOLEAN DEFAULT TRUE,
    `receive_email_notifications` BOOLEAN DEFAULT TRUE,
    `hourly_rate` DECIMAL(15,2),
    `slack_member_id` VARCHAR(255),
    `skills` TEXT,
    `probation_end_date` DATE,
    `notice_period_start_date` DATE,
    `notice_period_end_date` DATE,
    `employment_type` VARCHAR(255),
    `marital_status` VARCHAR(255),
    `internship_end_date` DATE,
    `business_address` VARCHAR(255),
    `exit_date` DATE,
    `profile_picture_url` LONGTEXT,
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`),
    FOREIGN KEY (`designation_id`) REFERENCES `designations`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`reporting_manager_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create module_permissions table
CREATE TABLE IF NOT EXISTS `module_permissions` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `role_id` BIGINT NOT NULL,
    `module` VARCHAR(255) NOT NULL,
    `add` VARCHAR(50) NOT NULL DEFAULT 'None',
    `view` VARCHAR(50) NOT NULL DEFAULT 'None',
    `update` VARCHAR(50) NOT NULL DEFAULT 'None',
    `delete` VARCHAR(50) NOT NULL DEFAULT 'None',
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    UNIQUE KEY `uk_role_module` (`role_id`, `module`),
    FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create project_categories table (must be before projects table)
CREATE TABLE IF NOT EXISTS `project_categories` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL UNIQUE,
    `created_by` BIGINT,
    `created_at` DATETIME(6),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create task_categories table (must be before tasks table)
CREATE TABLE IF NOT EXISTS `task_categories` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL UNIQUE,
    `created_by` BIGINT,
    `created_at` DATETIME(6),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create projects table
CREATE TABLE IF NOT EXISTS `projects` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(255) NOT NULL UNIQUE,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `summary` TEXT,
    `client_id` BIGINT,
    `start_date` DATE,
    `deadline` DATE,
    `end_date` DATE,
    `status` VARCHAR(50) NOT NULL DEFAULT 'PLANNING',
    `progress_percentage` INT DEFAULT 0,
    `auto_progress` BOOLEAN NOT NULL DEFAULT FALSE,
    `budget` DECIMAL(15,2),
    `created_by` BIGINT NOT NULL,
    `project_admin_id` BIGINT,
    `department_id` BIGINT,
    `category_id` BIGINT,
    `pinned` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
    FOREIGN KEY (`project_admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`category_id`) REFERENCES `project_categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create project_members join table
CREATE TABLE IF NOT EXISTS `project_members` (
    `project_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    PRIMARY KEY (`project_id`, `user_id`),
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create milestones table (must be before tasks table)
CREATE TABLE IF NOT EXISTS `milestones` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `project_id` BIGINT NOT NULL,
    `due_date` DATE,
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create tasks table
CREATE TABLE IF NOT EXISTS `tasks` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(255) NOT NULL UNIQUE,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `priority` VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    `pinned` BOOLEAN NOT NULL DEFAULT FALSE,
    `start_date` DATE,
    `due_date` DATE,
    `completed_on` DATETIME(6),
    `estimated_hours` DOUBLE,
    `hours_logged` DOUBLE DEFAULT 0.0,
    `attachment_name` VARCHAR(255),
    `attachment_path` VARCHAR(255),
    `attachment_content_type` VARCHAR(255),
    `project_id` BIGINT,
    `assigned_to` BIGINT NOT NULL,
    `created_by` BIGINT NOT NULL,
    `category_id` BIGINT,
    `milestone_id` BIGINT,
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
    FOREIGN KEY (`category_id`) REFERENCES `task_categories`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`milestone_id`) REFERENCES `milestones`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create task_assignees join table (must be after tasks table)
CREATE TABLE IF NOT EXISTS `task_assignees` (
    `task_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    PRIMARY KEY (`task_id`, `user_id`),
    FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create project_files table
CREATE TABLE IF NOT EXISTS `project_files` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `project_id` BIGINT NOT NULL,
    `uploaded_by` BIGINT,
    `original_file_name` VARCHAR(255) NOT NULL,
    `stored_file_name` VARCHAR(255),
    `cloudinary_url` VARCHAR(1000) NOT NULL,
    `content_type` VARCHAR(255) NOT NULL,
    `size_in_bytes` BIGINT NOT NULL,
    `uploaded_at` DATETIME(6),
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create task_files table
CREATE TABLE IF NOT EXISTS `task_files` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `task_id` BIGINT NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_url` TEXT NOT NULL,
    `file_size` BIGINT,
    `content_type` VARCHAR(255),
    `uploaded_by_id` BIGINT NOT NULL,
    `created_at` DATETIME(6),
    FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`uploaded_by_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create shifts table
CREATE TABLE IF NOT EXISTS `shifts` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL UNIQUE,
    `start_time` TIME NOT NULL,
    `end_time` TIME NOT NULL,
    `grace_minutes` INT NOT NULL DEFAULT 15,
    `description` VARCHAR(255),
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create shift_assignments table
CREATE TABLE IF NOT EXISTS `shift_assignments` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `shift_id` BIGINT NOT NULL,
    `shift_date` DATE NOT NULL,
    `remark` TEXT,
    `send_email` BOOLEAN DEFAULT FALSE,
    `attachment_name` VARCHAR(255),
    `attachment_data` LONGTEXT,
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    UNIQUE KEY `uk_shift_assignment_user_date` (`user_id`, `shift_date`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`shift_id`) REFERENCES `shifts`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create attendances table
CREATE TABLE IF NOT EXISTS `attendances` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `attendance_date` DATE NOT NULL,
    `status` VARCHAR(50) NOT NULL,
    `clock_in` TIME,
    `clock_out` TIME,
    `duration_minutes` BIGINT,
    `break_minutes` BIGINT DEFAULT 0,
    `notes` VARCHAR(255),
    `clock_in_latitude` DOUBLE,
    `clock_in_longitude` DOUBLE,
    `clock_in_location` VARCHAR(255),
    `clock_in_working_from` VARCHAR(255),
    `clock_out_latitude` DOUBLE,
    `clock_out_longitude` DOUBLE,
    `clock_out_location` VARCHAR(255),
    `clock_out_working_from` VARCHAR(255),
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    UNIQUE KEY `uk_user_attendance_date` (`user_id`, `attendance_date`),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create leave_types table
CREATE TABLE IF NOT EXISTS `leave_types` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `allotment_type` VARCHAR(50) NOT NULL,
    `no_of_leaves` DOUBLE NOT NULL DEFAULT 0.0,
    `paid_status` VARCHAR(50) NOT NULL,
    `effective_after_value` INT NOT NULL DEFAULT 0,
    `effective_after_unit` VARCHAR(50) NOT NULL DEFAULT 'DAYS',
    `unused_leaves_action` VARCHAR(50) NOT NULL DEFAULT 'CARRY_FORWARD',
    `over_utilization_action` VARCHAR(50) NOT NULL DEFAULT 'DO_NOT_ALLOW',
    `allowed_in_probation` BOOLEAN NOT NULL DEFAULT FALSE,
    `allowed_in_notice_period` BOOLEAN NOT NULL DEFAULT FALSE,
    `genders` TEXT,
    `marital_statuses` TEXT,
    `departments` TEXT,
    `designations` TEXT,
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create leaves table
CREATE TABLE IF NOT EXISTS `leaves` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT NOT NULL,
    `leave_type_id` BIGINT NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `duration_type` VARCHAR(50) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `reason` TEXT,
    `file_url` TEXT,
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create holidays table
CREATE TABLE IF NOT EXISTS `holidays` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `date` DATE NOT NULL,
    `occasion` VARCHAR(255) NOT NULL,
    `is_common` BOOLEAN NOT NULL DEFAULT FALSE,
    `departments` TEXT,
    `designations` TEXT,
    `employment_types` TEXT,
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create events table
CREATE TABLE IF NOT EXISTS `events` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `event_name` VARCHAR(255) NOT NULL,
    `where` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `starts_on_date` DATE NOT NULL,
    `starts_on_time` TIME NOT NULL,
    `ends_on_date` DATE NOT NULL,
    `ends_on_time` TIME NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `event_link` VARCHAR(255),
    `created_by` BIGINT,
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create event_departments join table
CREATE TABLE IF NOT EXISTS `event_departments` (
    `event_id` BIGINT NOT NULL,
    `department_id` BIGINT NOT NULL,
    PRIMARY KEY (`event_id`, `department_id`),
    FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create event_employees join table
CREATE TABLE IF NOT EXISTS `event_employees` (
    `event_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    PRIMARY KEY (`event_id`, `user_id`),
    FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create tickets table
CREATE TABLE IF NOT EXISTS `tickets` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `ticket_number` VARCHAR(255) NOT NULL UNIQUE,
    `subject` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `status` VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    `priority` VARCHAR(50) NOT NULL DEFAULT 'LOW',
    `requester_id` BIGINT NOT NULL,
    `assigned_agent_id` BIGINT,
    `assign_group` VARCHAR(255),
    `project_id` BIGINT,
    `ticket_type` VARCHAR(255),
    `channel_name` VARCHAR(255),
    `tags` TEXT,
    `requester_email` VARCHAR(255),
    `requester_type` VARCHAR(255),
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`assigned_agent_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create ticket_replies table
CREATE TABLE IF NOT EXISTS `ticket_replies` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `ticket_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `message` TEXT NOT NULL,
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create ticket_files table
CREATE TABLE IF NOT EXISTS `ticket_files` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `ticket_id` BIGINT NOT NULL,
    `reply_id` BIGINT,
    `file_name` VARCHAR(255) NOT NULL,
    `file_content` LONGTEXT NULL,
    `file_path` VARCHAR(1000) NOT NULL,
    `file_size` BIGINT,
    `content_type` VARCHAR(255),
    `created_at` DATETIME(6),
    FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`reply_id`) REFERENCES `ticket_replies`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create ticket_activities table
CREATE TABLE IF NOT EXISTS `ticket_activities` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `ticket_id` BIGINT NOT NULL,
    `user_id` BIGINT NOT NULL,
    `action` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(6),
    FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- RECRUITMENT MODULE TABLES (Independent from Dashboard)
-- ============================================

-- Create recruitment_roles table (separate from dashboard roles)
CREATE TABLE IF NOT EXISTS `recruitment_roles` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL UNIQUE,
    `type` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255),
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create recruitment_users table (separate from dashboard users)
CREATE TABLE IF NOT EXISTS `recruitment_users` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `phone_number` VARCHAR(255),
    `role_id` BIGINT NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    FOREIGN KEY (`role_id`) REFERENCES `recruitment_roles`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create candidates table
CREATE TABLE IF NOT EXISTS `candidates` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `first_name` VARCHAR(255) NOT NULL,
    `last_name` VARCHAR(255) NOT NULL,
    `middle_name` VARCHAR(255),
    `phone_number` VARCHAR(255) NOT NULL,
    `role_id` BIGINT NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    FOREIGN KEY (`role_id`) REFERENCES `recruitment_roles`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Performance indexes for frequently queried fields
-- NOTE: This approach uses dynamic SQL to safely create indexes on all MySQL versions
-- Indexes will only be created if they don't already exist

-- ============================================
-- CRITICAL PERFORMANCE INDEXES
-- ============================================

-- Users table indexes (for employee queries)
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND INDEX_NAME='idx_users_status') > 0,
    'SELECT ''Index idx_users_status already exists'' AS message',
    'CREATE INDEX `idx_users_status` ON `users`(`status`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND INDEX_NAME='idx_users_role_id') > 0,
    'SELECT ''Index idx_users_role_id already exists'' AS message',
    'CREATE INDEX `idx_users_role_id` ON `users`(`role_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND INDEX_NAME='idx_users_designation_id') > 0,
    'SELECT ''Index idx_users_designation_id already exists'' AS message',
    'CREATE INDEX `idx_users_designation_id` ON `users`(`designation_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND INDEX_NAME='idx_users_reporting_manager_id') > 0,
    'SELECT ''Index idx_users_reporting_manager_id already exists'' AS message',
    'CREATE INDEX `idx_users_reporting_manager_id` ON `users`(`reporting_manager_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND INDEX_NAME='idx_users_employee_id') > 0,
    'SELECT ''Index idx_users_employee_id already exists'' AS message',
    'CREATE INDEX `idx_users_employee_id` ON `users`(`employee_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Composite index for common queries
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND INDEX_NAME='idx_users_status_role') > 0,
    'SELECT ''Index idx_users_status_role already exists'' AS message',
    'CREATE INDEX `idx_users_status_role` ON `users`(`status`, `role_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Attendance table indexes (for attendance queries - CRITICAL for performance)
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='attendances' AND INDEX_NAME='idx_attendance_user_id') > 0,
    'SELECT ''Index idx_attendance_user_id already exists'' AS message',
    'CREATE INDEX `idx_attendance_user_id` ON `attendances`(`user_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='attendances' AND INDEX_NAME='idx_attendance_date') > 0,
    'SELECT ''Index idx_attendance_date already exists'' AS message',
    'CREATE INDEX `idx_attendance_date` ON `attendances`(`attendance_date`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Composite index for user + date queries (most common attendance query pattern)
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='attendances' AND INDEX_NAME='idx_attendance_user_date') > 0,
    'SELECT ''Index idx_attendance_user_date already exists'' AS message',
    'CREATE INDEX `idx_attendance_user_date` ON `attendances`(`user_id`, `attendance_date`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index for date range queries
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='attendances' AND INDEX_NAME='idx_attendance_date_status') > 0,
    'SELECT ''Index idx_attendance_date_status already exists'' AS message',
    'CREATE INDEX `idx_attendance_date_status` ON `attendances`(`attendance_date`, `status`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Shift assignments indexes
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shift_assignments' AND INDEX_NAME='idx_shift_assignment_user_id') > 0,
    'SELECT ''Index idx_shift_assignment_user_id already exists'' AS message',
    'CREATE INDEX `idx_shift_assignment_user_id` ON `shift_assignments`(`user_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shift_assignments' AND INDEX_NAME='idx_shift_assignment_date') > 0,
    'SELECT ''Index idx_shift_assignment_date already exists'' AS message',
    'CREATE INDEX `idx_shift_assignment_date` ON `shift_assignments`(`shift_date`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Composite index for user + date lookups
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='shift_assignments' AND INDEX_NAME='idx_shift_assignment_user_date') > 0,
    'SELECT ''Index idx_shift_assignment_user_date already exists'' AS message',
    'CREATE INDEX `idx_shift_assignment_user_date` ON `shift_assignments`(`user_id`, `shift_date`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Module permissions indexes (for permission checks)
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='module_permissions' AND INDEX_NAME='idx_module_permission_role_id') > 0,
    'SELECT ''Index idx_module_permission_role_id already exists'' AS message',
    'CREATE INDEX `idx_module_permission_role_id` ON `module_permissions`(`role_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='module_permissions' AND INDEX_NAME='idx_module_permission_role_module') > 0,
    'SELECT ''Index idx_module_permission_role_module already exists'' AS message',
    'CREATE INDEX `idx_module_permission_role_module` ON `module_permissions`(`role_id`, `module`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Leaves table indexes (for attendance calculations)
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='leaves' AND INDEX_NAME='idx_leaves_user_id') > 0,
    'SELECT ''Index idx_leaves_user_id already exists'' AS message',
    'CREATE INDEX `idx_leaves_user_id` ON `leaves`(`user_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='leaves' AND INDEX_NAME='idx_leaves_status') > 0,
    'SELECT ''Index idx_leaves_status already exists'' AS message',
    'CREATE INDEX `idx_leaves_status` ON `leaves`(`status`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='leaves' AND INDEX_NAME='idx_leaves_date_range') > 0,
    'SELECT ''Index idx_leaves_date_range already exists'' AS message',
    'CREATE INDEX `idx_leaves_date_range` ON `leaves`(`start_date`, `end_date`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='leaves' AND INDEX_NAME='idx_leaves_user_date_range') > 0,
    'SELECT ''Index idx_leaves_user_date_range already exists'' AS message',
    'CREATE INDEX `idx_leaves_user_date_range` ON `leaves`(`user_id`, `start_date`, `end_date`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Holidays table indexes
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='holidays' AND INDEX_NAME='idx_holidays_date') > 0,
    'SELECT ''Index idx_holidays_date already exists'' AS message',
    'CREATE INDEX `idx_holidays_date` ON `holidays`(`date`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='holidays' AND INDEX_NAME='idx_holidays_date_range') > 0,
    'SELECT ''Index idx_holidays_date_range already exists'' AS message',
    'CREATE INDEX `idx_holidays_date_range` ON `holidays`(`date`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tasks table indexes (for performance)
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tasks' AND INDEX_NAME='idx_tasks_assigned_to') > 0,
    'SELECT ''Index idx_tasks_assigned_to already exists'' AS message',
    'CREATE INDEX `idx_tasks_assigned_to` ON `tasks`(`assigned_to`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tasks' AND INDEX_NAME='idx_tasks_status') > 0,
    'SELECT ''Index idx_tasks_status already exists'' AS message',
    'CREATE INDEX `idx_tasks_status` ON `tasks`(`status`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tasks' AND INDEX_NAME='idx_tasks_project_id') > 0,
    'SELECT ''Index idx_tasks_project_id already exists'' AS message',
    'CREATE INDEX `idx_tasks_project_id` ON `tasks`(`project_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Projects table indexes
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='projects' AND INDEX_NAME='idx_projects_status') > 0,
    'SELECT ''Index idx_projects_status already exists'' AS message',
    'CREATE INDEX `idx_projects_status` ON `projects`(`status`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='projects' AND INDEX_NAME='idx_projects_created_by') > 0,
    'SELECT ''Index idx_projects_created_by already exists'' AS message',
    'CREATE INDEX `idx_projects_created_by` ON `projects`(`created_by`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Tickets table indexes
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND INDEX_NAME='idx_tickets_requester_id') > 0,
    'SELECT ''Index idx_tickets_requester_id already exists'' AS message',
    'CREATE INDEX `idx_tickets_requester_id` ON `tickets`(`requester_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND INDEX_NAME='idx_tickets_status') > 0,
    'SELECT ''Index idx_tickets_status already exists'' AS message',
    'CREATE INDEX `idx_tickets_status` ON `tickets`(`status`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tickets' AND INDEX_NAME='idx_tickets_assigned_agent_id') > 0,
    'SELECT ''Index idx_tickets_assigned_agent_id already exists'' AS message',
    'CREATE INDEX `idx_tickets_assigned_agent_id` ON `tickets`(`assigned_agent_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- DATABASE MIGRATION FIX FOR TICKET_FILES
-- ============================================
-- Fix: Remove cloudinary_url column from ticket_files table
-- This column is no longer used - we use file_path for local file storage
-- Files are stored in the 'ticket-files' directory and paths are stored in file_path column
--
-- To fix existing databases, run this SQL manually:
-- ALTER TABLE `ticket_files` DROP COLUMN `cloudinary_url`;
--

-- Indexes for recruitment tables
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='recruitment_users' AND INDEX_NAME='idx_recruitment_users_role_id') > 0,
    'SELECT ''Index idx_recruitment_users_role_id already exists'' AS message',
    'CREATE INDEX `idx_recruitment_users_role_id` ON `recruitment_users`(`role_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='candidates' AND INDEX_NAME='idx_candidates_role_id') > 0,
    'SELECT ''Index idx_candidates_role_id already exists'' AS message',
    'CREATE INDEX `idx_candidates_role_id` ON `candidates`(`role_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create job_openings table
CREATE TABLE IF NOT EXISTS `job_openings` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `job_title` VARCHAR(255) NOT NULL,
    `job_name` VARCHAR(255) NOT NULL,
    `location` VARCHAR(255) NOT NULL,
    `job_type` VARCHAR(50) NOT NULL,
    `work_mode` VARCHAR(50) NOT NULL,
    `department` VARCHAR(255) NOT NULL,
    `application_date` DATE NOT NULL,
    `expected_joining_date` DATE,
    `number_of_openings` INT NOT NULL DEFAULT 0,
    `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    `posted_date` DATE,
    `min_experience_years` INT DEFAULT 0,
    `required_skills` TEXT,
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    FOREIGN KEY (`created_by`) REFERENCES `recruitment_users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='job_openings' AND INDEX_NAME='idx_job_openings_status') > 0,
    'SELECT ''Index idx_job_openings_status already exists'' AS message',
    'CREATE INDEX `idx_job_openings_status` ON `job_openings`(`status`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='job_openings' AND INDEX_NAME='idx_job_openings_created_by') > 0,
    'SELECT ''Index idx_job_openings_created_by already exists'' AS message',
    'CREATE INDEX `idx_job_openings_created_by` ON `job_openings`(`created_by`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migration: Add closed_at for auto-closure workflow (skipped if column exists)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'job_openings' 
AND COLUMN_NAME = 'closed_at';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE `job_openings` ADD COLUMN `closed_at` DATETIME(6) NULL AFTER `updated_at`',
    'SELECT ''Column closed_at already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add missing columns to job_openings table
-- Note: These statements will be skipped if columns already exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'job_openings' 
AND COLUMN_NAME = 'min_experience_years';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE `job_openings` ADD COLUMN `min_experience_years` INT DEFAULT 0 AFTER `posted_date`',
    'SELECT ''Column min_experience_years already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'job_openings' 
AND COLUMN_NAME = 'required_skills';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE `job_openings` ADD COLUMN `required_skills` TEXT AFTER `min_experience_years`',
    'SELECT ''Column required_skills already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migration: Rename application_count to number_of_openings (run on existing DBs; skip if column already renamed)
-- Check if old column exists before renaming
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'job_openings' 
AND COLUMN_NAME = 'application_count';

SET @sql = IF(@col_exists > 0, 
    'ALTER TABLE `job_openings` CHANGE COLUMN `application_count` `number_of_openings` INT NOT NULL DEFAULT 0',
    'SELECT ''Column application_count does not exist or already renamed'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create job_applications table
CREATE TABLE IF NOT EXISTS `job_applications` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `job_opening_id` BIGINT NOT NULL,
    `candidate_id` BIGINT NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `cover_letter` TEXT,
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    FOREIGN KEY (`job_opening_id`) REFERENCES `job_openings`(`id`),
    FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`),
    UNIQUE KEY `uk_job_application_job_candidate` (`job_opening_id`, `candidate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='job_applications' AND INDEX_NAME='idx_job_applications_job_opening') > 0,
    'SELECT ''Index idx_job_applications_job_opening already exists'' AS message',
    'CREATE INDEX `idx_job_applications_job_opening` ON `job_applications`(`job_opening_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='job_applications' AND INDEX_NAME='idx_job_applications_candidate') > 0,
    'SELECT ''Index idx_job_applications_candidate already exists'' AS message',
    'CREATE INDEX `idx_job_applications_candidate` ON `job_applications`(`candidate_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migration: Add stage-specific status columns for recruitment journey tracking
-- These columns track independent completion status for each recruitment stage
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'job_applications' 
AND COLUMN_NAME = 'screening_status';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE `job_applications` ADD COLUMN `screening_status` VARCHAR(20) DEFAULT ''PENDING'' AFTER `cover_letter`',
    'SELECT ''Column screening_status already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'job_applications' 
AND COLUMN_NAME = 'technical_status';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE `job_applications` ADD COLUMN `technical_status` VARCHAR(20) DEFAULT ''PENDING'' AFTER `screening_status`',
    'SELECT ''Column technical_status already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'job_applications' 
AND COLUMN_NAME = 'hr_status';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE `job_applications` ADD COLUMN `hr_status` VARCHAR(20) DEFAULT ''PENDING'' AFTER `technical_status`',
    'SELECT ''Column hr_status already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'job_applications' 
AND COLUMN_NAME = 'offer_status';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE `job_applications` ADD COLUMN `offer_status` VARCHAR(20) DEFAULT ''PENDING'' AFTER `hr_status`',
    'SELECT ''Column offer_status already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migrate existing data: Set screening_status based on current status
UPDATE `job_applications` 
SET `screening_status` = CASE 
    WHEN `status` IN ('SHORTLISTED', 'ACCEPTED', 'OFFER_RELEASED') THEN 'PASSED'
    WHEN `status` = 'REJECTED' THEN 'REJECTED'
    ELSE 'PENDING'
END
WHERE `screening_status` = 'PENDING';

-- Create interview_assignments table (assigns candidates to technical interviewers)
CREATE TABLE IF NOT EXISTS `interview_assignments` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `interviewer_id` BIGINT NOT NULL,
    `candidate_id` BIGINT NOT NULL,
    `job_application_id` BIGINT NOT NULL,
    `assigned_by` BIGINT NOT NULL,
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    FOREIGN KEY (`interviewer_id`) REFERENCES `recruitment_users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`job_application_id`) REFERENCES `job_applications`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`assigned_by`) REFERENCES `recruitment_users`(`id`) ON DELETE CASCADE,
    UNIQUE KEY `uk_interview_assignment_interviewer_candidate_job` (`interviewer_id`, `candidate_id`, `job_application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='interview_assignments' AND INDEX_NAME='idx_interview_assignments_interviewer') > 0,
    'SELECT ''Index idx_interview_assignments_interviewer already exists'' AS message',
    'CREATE INDEX `idx_interview_assignments_interviewer` ON `interview_assignments`(`interviewer_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='interview_assignments' AND INDEX_NAME='idx_interview_assignments_candidate') > 0,
    'SELECT ''Index idx_interview_assignments_candidate already exists'' AS message',
    'CREATE INDEX `idx_interview_assignments_candidate` ON `interview_assignments`(`candidate_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='interview_assignments' AND INDEX_NAME='idx_interview_assignments_job_application') > 0,
    'SELECT ''Index idx_interview_assignments_job_application already exists'' AS message',
    'CREATE INDEX `idx_interview_assignments_job_application` ON `interview_assignments`(`job_application_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create interviews table (scheduled interviews)
CREATE TABLE IF NOT EXISTS `interviews` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `interview_assignment_id` BIGINT NOT NULL,
    `interview_date` DATE NOT NULL,
    `interview_time` TIME NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
    `notes` TEXT,
    `meet_link` VARCHAR(500),
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    FOREIGN KEY (`interview_assignment_id`) REFERENCES `interview_assignments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='interviews' AND INDEX_NAME='idx_interviews_assignment') > 0,
    'SELECT ''Index idx_interviews_assignment already exists'' AS message',
    'CREATE INDEX `idx_interviews_assignment` ON `interviews`(`interview_assignment_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='interviews' AND INDEX_NAME='idx_interviews_date') > 0,
    'SELECT ''Index idx_interviews_date already exists'' AS message',
    'CREATE INDEX `idx_interviews_date` ON `interviews`(`interview_date`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='interviews' AND INDEX_NAME='idx_interviews_status') > 0,
    'SELECT ''Index idx_interviews_status already exists'' AS message',
    'CREATE INDEX `idx_interviews_status` ON `interviews`(`status`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add meet_link column to interviews table if it doesn't exist (for existing databases)
-- Note: This will be skipped if column already exists due to continue-on-error: true in application.yml
-- ALTER TABLE `interviews` ADD COLUMN `meet_link` VARCHAR(500) AFTER `notes`;

-- Create google_oauth_tokens table for storing Google OAuth tokens securely
CREATE TABLE IF NOT EXISTS `google_oauth_tokens` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `access_token` TEXT NOT NULL,
    `refresh_token` TEXT NOT NULL,
    `token_type` VARCHAR(50) DEFAULT 'Bearer',
    `expires_in` BIGINT,
    `scope` TEXT,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='google_oauth_tokens' AND INDEX_NAME='idx_google_oauth_tokens_active') > 0,
    'SELECT ''Index idx_google_oauth_tokens_active already exists'' AS message',
    'CREATE INDEX `idx_google_oauth_tokens_active` ON `google_oauth_tokens`(`is_active`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='google_oauth_tokens' AND INDEX_NAME='idx_google_oauth_tokens_updated') > 0,
    'SELECT ''Index idx_google_oauth_tokens_updated already exists'' AS message',
    'CREATE INDEX `idx_google_oauth_tokens_updated` ON `google_oauth_tokens`(`updated_at`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- AUTO-MIGRATION: Add new interview columns
-- ============================================
-- These columns are added conditionally to support interview round management
-- Script checks if columns exist before adding them (safe to run multiple times)

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'interviews' 
AND COLUMN_NAME = 'interview_round';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE interviews ADD COLUMN interview_round VARCHAR(50) DEFAULT ''TECHNICAL'' AFTER meet_link',
    'SELECT ''Column interview_round already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'interviews' 
AND COLUMN_NAME = 'result';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE interviews ADD COLUMN result VARCHAR(50) DEFAULT ''PENDING'' AFTER interview_round',
    'SELECT ''Column result already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'interviews' 
AND COLUMN_NAME = 'remarks';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE interviews ADD COLUMN remarks TEXT AFTER result',
    'SELECT ''Column remarks already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'interviews' 
AND COLUMN_NAME = 'assigned_recruiter_id';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE interviews ADD COLUMN assigned_recruiter_id BIGINT NULL AFTER remarks',
    'SELECT ''Column assigned_recruiter_id already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint for assigned_recruiter_id if it doesn't exist
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM information_schema.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'interviews' 
AND CONSTRAINT_NAME = 'fk_interview_assigned_recruiter';

SET @sql = IF(@fk_exists = 0, 
    'ALTER TABLE interviews ADD CONSTRAINT fk_interview_assigned_recruiter FOREIGN KEY (assigned_recruiter_id) REFERENCES recruitment_users(id) ON DELETE SET NULL ON UPDATE CASCADE',
    'SELECT ''Foreign key fk_interview_assigned_recruiter already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for assigned_recruiter_id if it doesn't exist
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists 
FROM information_schema.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'interviews' 
AND INDEX_NAME = 'idx_interviews_assigned_recruiter';

SET @sql = IF(@idx_exists = 0, 
    'CREATE INDEX idx_interviews_assigned_recruiter ON interviews(assigned_recruiter_id)',
    'SELECT ''Index idx_interviews_assigned_recruiter already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- EMPLOYEE ID SEQUENCE TABLE
-- ============================================
-- This table provides a single source of truth for employee ID generation
-- It automatically initializes from existing employee records (users table)
-- and provides thread-safe, atomic ID generation for offer letters

CREATE TABLE IF NOT EXISTS `employee_id_sequence` (
    `id` INT PRIMARY KEY DEFAULT 1,
    `current_value` INT NOT NULL DEFAULT 0,
    `updated_at` DATETIME(6),
    CHECK (`id` = 1)  -- Ensure only one row exists (singleton pattern)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: The sequence will be automatically initialized on first use by the application
-- It will scan both 'users.employee_id' and 'offer_letters.employee_id' columns
-- to find the maximum existing employee ID and start from there

-- ============================================
-- OFFER LETTERS TABLE
-- ============================================
-- This table stores offer letters generated for candidates
-- Links to candidates, job openings, and recruitment users

CREATE TABLE IF NOT EXISTS `offer_letters` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `candidate_id` BIGINT NOT NULL,
    `job_opening_id` BIGINT NOT NULL,
    `employee_id` VARCHAR(50) NOT NULL UNIQUE,
    `job_title` VARCHAR(255) NOT NULL,
    `position` VARCHAR(255) NOT NULL,
    `department` VARCHAR(255) NOT NULL,
    `stipend_amount` VARCHAR(100) NOT NULL,
    `ctc_amount` VARCHAR(100) NOT NULL,
    `joining_date` DATE NOT NULL,
    `offer_date` DATE NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'CREATED',
    `sent_at` DATETIME(6),
    `responded_at` DATETIME(6),
    `created_by` BIGINT NOT NULL,
    `created_at` DATETIME(6),
    `updated_at` DATETIME(6),
    `documents_verified` BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (`candidate_id`) REFERENCES `candidates`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`job_opening_id`) REFERENCES `job_openings`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`created_by`) REFERENCES `recruitment_users`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indexes for offer_letters table
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='offer_letters' AND INDEX_NAME='idx_offer_letters_candidate') > 0,
    'SELECT ''Index idx_offer_letters_candidate already exists'' AS message',
    'CREATE INDEX `idx_offer_letters_candidate` ON `offer_letters`(`candidate_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='offer_letters' AND INDEX_NAME='idx_offer_letters_job_opening') > 0,
    'SELECT ''Index idx_offer_letters_job_opening already exists'' AS message',
    'CREATE INDEX `idx_offer_letters_job_opening` ON `offer_letters`(`job_opening_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='offer_letters' AND INDEX_NAME='idx_offer_letters_employee_id') > 0,
    'SELECT ''Index idx_offer_letters_employee_id already exists'' AS message',
    'CREATE INDEX `idx_offer_letters_employee_id` ON `offer_letters`(`employee_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='offer_letters' AND INDEX_NAME='idx_offer_letters_status') > 0,
    'SELECT ''Index idx_offer_letters_status already exists'' AS message',
    'CREATE INDEX `idx_offer_letters_status` ON `offer_letters`(`status`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='offer_letters' AND INDEX_NAME='idx_offer_letters_created_by') > 0,
    'SELECT ''Index idx_offer_letters_created_by already exists'' AS message',
    'CREATE INDEX `idx_offer_letters_created_by` ON `offer_letters`(`created_by`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- AUTO-MIGRATION: Add status column to candidates and recruitment_users
-- ============================================

-- Add status column to candidates table if it doesn't exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'candidates' 
AND COLUMN_NAME = 'status';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE candidates ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT ''ACTIVE'' AFTER role_id',
    'SELECT ''Column status already exists in candidates'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add status column to recruitment_users table if it doesn't exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'recruitment_users' 
AND COLUMN_NAME = 'status';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE recruitment_users ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT ''ACTIVE'' AFTER role_id',
    'SELECT ''Column status already exists in recruitment_users'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- AUTO-MIGRATION: Add documents_verified to offer_letters
-- ============================================
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'offer_letters' 
AND COLUMN_NAME = 'documents_verified';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE offer_letters ADD COLUMN documents_verified BOOLEAN NOT NULL DEFAULT FALSE',
    'SELECT ''Column documents_verified already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- OFFER DOCUMENTS TABLE
-- ============================================
-- This table stores documents uploaded by candidates for offer verification
-- Linked to offer_letters and recruitment_users (verifier)

CREATE TABLE IF NOT EXISTS `offer_documents` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `offer_letter_id` BIGINT NOT NULL,
    `document_type` VARCHAR(50) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_type` VARCHAR(50) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_size` BIGINT,
    `verification_status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `remark` TEXT,
    `uploaded_at` DATETIME(6),
    `verified_at` DATETIME(6),
    `verified_by` BIGINT,
    `updated_at` DATETIME(6),
    FOREIGN KEY (`offer_letter_id`) REFERENCES `offer_letters`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`verified_by`) REFERENCES `recruitment_users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create indexes for offer_documents table
SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='offer_documents' AND INDEX_NAME='idx_offer_documents_offer_letter') > 0,
    'SELECT ''Index idx_offer_documents_offer_letter already exists'' AS message',
    'CREATE INDEX `idx_offer_documents_offer_letter` ON `offer_documents`(`offer_letter_id`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @s = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
     WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='offer_documents' AND INDEX_NAME='idx_offer_documents_status') > 0,
    'SELECT ''Index idx_offer_documents_status already exists'' AS message',
    'CREATE INDEX `idx_offer_documents_status` ON `offer_documents`(`verification_status`)'
));
PREPARE stmt FROM @s;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
