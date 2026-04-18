package com.dashboard.app.service;

import com.dashboard.app.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * Service for generating HTML email content from templates for the Employee Dashboard.
 * Templates are loaded from classpath and placeholders are replaced with dynamic values.
 */
@Service
public class DashboardEmailTemplateService {

    private static final Logger logger = LoggerFactory.getLogger(DashboardEmailTemplateService.class);
    private static final String TEMPLATE_BASE_PATH = "email-templates/dashboard/";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("MMMM dd, yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("hh:mm a");

    // Template file names
    public static final String TEMPLATE_LEAVE_APPROVED = "leave-approved";
    public static final String TEMPLATE_LEAVE_REJECTED = "leave-rejected";
    public static final String TEMPLATE_TICKET_CREATED = "ticket-created";
    public static final String TEMPLATE_TICKET_ASSIGNED = "ticket-assigned";
    public static final String TEMPLATE_TICKET_STATUS_UPDATE = "ticket-status-update";
    public static final String TEMPLATE_EVENT_CREATED = "event-created";
    public static final String TEMPLATE_EVENT_ASSIGNED = "event-assigned";
    public static final String TEMPLATE_PROJECT_ASSIGNED = "project-assigned";
    public static final String TEMPLATE_TASK_ASSIGNED = "task-assigned";
    public static final String TEMPLATE_SHIFT_ASSIGNED = "shift-assigned";
    public static final String TEMPLATE_SHIFT_UPDATED = "shift-updated";
    public static final String TEMPLATE_HOLIDAY_ANNOUNCEMENT = "holiday-announcement";

    // Default company information
    private static final String DEFAULT_COMPANY_NAME = "Thynk Technology India";
    private static final String DEFAULT_COMPANY_WEBSITE = "https://worksphere.ltd";
    private static final String DEFAULT_SUPPORT_EMAIL = "support@worksphere.com";

    /**
     * Load template from resources
     */
    private String loadTemplate(String templateName) throws IOException {
        String templatePath = TEMPLATE_BASE_PATH + templateName + ".html";
        ClassPathResource resource = new ClassPathResource(templatePath);
        return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    }

    /**
     * Replace placeholders in template with provided values
     */
    private String replacePlaceholders(String template, Map<String, String> placeholders) {
        String result = template;
        for (Map.Entry<String, String> entry : placeholders.entrySet()) {
            String placeholder = "{{" + entry.getKey() + "}}";
            String value = entry.getValue() != null ? entry.getValue() : "";
            result = result.replace(placeholder, value);
        }
        return result;
    }

    /**
     * Get default placeholders with company branding
     */
    private Map<String, String> getDefaultPlaceholders(String logoUrl) {
        Map<String, String> placeholders = new HashMap<>();
        placeholders.put("company_name", DEFAULT_COMPANY_NAME);
        placeholders.put("company_website", DEFAULT_COMPANY_WEBSITE);
        placeholders.put("support_email", DEFAULT_SUPPORT_EMAIL);
        placeholders.put("contact_url", "https://worksphere.ltd/contact");
        placeholders.put("logo_url", logoUrl != null ? logoUrl : "");
        placeholders.put("current_year", String.valueOf(LocalDate.now().getYear()));
        return placeholders;
    }

    // ==================== LEAVE TEMPLATES ====================

    /**
     * Generate leave approved email
     */
    public String generateLeaveApprovedEmail(String employeeName, String leaveType, LocalDate startDate,
                                              LocalDate endDate, String approverName, String portalUrl, String logoUrl, Long leaveId) {
        try {
            String template = loadTemplate(TEMPLATE_LEAVE_APPROVED);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("employee_name", employeeName != null ? employeeName : "Employee");
            placeholders.put("leave_type", leaveType != null ? leaveType : "Leave");
            placeholders.put("start_date", startDate != null ? startDate.format(DATE_FORMATTER) : "TBD");
            placeholders.put("end_date", endDate != null ? endDate.format(DATE_FORMATTER) : "TBD");
            placeholders.put("approver_name", approverName != null ? approverName : "HR Team");
            placeholders.put("portal_url", portalUrl != null ? portalUrl : "#");
            placeholders.put("dashboard_link", portalUrl + "/leaves/" + (leaveId != null ? leaveId : ""));
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load leave approved template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_LEAVE_APPROVED);
        }
    }

    /**
     * Generate leave rejected email
     */
    public String generateLeaveRejectedEmail(String employeeName, String leaveType, LocalDate startDate,
                                              LocalDate endDate, String rejectorName, String reason,
                                              String portalUrl, String logoUrl, Long leaveId) {
        try {
            String template = loadTemplate(TEMPLATE_LEAVE_REJECTED);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("employee_name", employeeName != null ? employeeName : "Employee");
            placeholders.put("leave_type", leaveType != null ? leaveType : "Leave");
            placeholders.put("start_date", startDate != null ? startDate.format(DATE_FORMATTER) : "TBD");
            placeholders.put("end_date", endDate != null ? endDate.format(DATE_FORMATTER) : "TBD");
            placeholders.put("rejector_name", rejectorName != null ? rejectorName : "HR Team");
            placeholders.put("rejection_reason", reason != null && !reason.isEmpty() ? reason : "No specific reason provided");
            placeholders.put("reason_display", reason != null && !reason.isEmpty() ? "block" : "none");
            placeholders.put("portal_url", portalUrl != null ? portalUrl : "#");
            placeholders.put("dashboard_link", portalUrl + "/leaves/" + (leaveId != null ? leaveId : ""));
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load leave rejected template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_LEAVE_REJECTED);
        }
    }

    // ==================== TICKET TEMPLATES ====================

    /**
     * Generate ticket created email (for admin)
     */
    public String generateTicketCreatedEmail(String ticketNumber, String subject, String requesterName,
                                              String requesterEmail, String priority, String portalUrl, String logoUrl, Long ticketId) {
        try {
            String template = loadTemplate(TEMPLATE_TICKET_CREATED);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("ticket_number", ticketNumber != null ? ticketNumber : "N/A");
            placeholders.put("ticket_subject", subject != null ? subject : "No Subject");
            placeholders.put("requester_name", requesterName != null ? requesterName : "Unknown");
            placeholders.put("requester_email", requesterEmail != null ? requesterEmail : "N/A");
            placeholders.put("priority", priority != null ? priority : "LOW");
            placeholders.put("priority_class", getPriorityClass(priority));
            placeholders.put("portal_url", portalUrl != null ? portalUrl : "#");
            placeholders.put("dashboard_link", portalUrl + "/tickets/" + (ticketId != null ? ticketId : ""));
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load ticket created template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_TICKET_CREATED);
        }
    }

    /**
     * Generate ticket assigned email
     */
    public String generateTicketAssignedEmail(String assigneeName, String ticketNumber, String subject,
                                               String priority, String requesterName, String portalUrl, String logoUrl, Long ticketId) {
        try {
            String template = loadTemplate(TEMPLATE_TICKET_ASSIGNED);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("assignee_name", assigneeName != null ? assigneeName : "Employee");
            placeholders.put("ticket_number", ticketNumber != null ? ticketNumber : "N/A");
            placeholders.put("ticket_subject", subject != null ? subject : "No Subject");
            placeholders.put("priority", priority != null ? priority : "LOW");
            placeholders.put("priority_class", getPriorityClass(priority));
            placeholders.put("requester_name", requesterName != null ? requesterName : "Unknown");
            placeholders.put("portal_url", portalUrl != null ? portalUrl : "#");
            placeholders.put("dashboard_link", portalUrl + "/tickets/" + (ticketId != null ? ticketId : ""));
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load ticket assigned template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_TICKET_ASSIGNED);
        }
    }

    /**
     * Generate ticket status update email
     */
    public String generateTicketStatusUpdateEmail(String recipientName, String ticketNumber, String subject,
                                                   String oldStatus, String newStatus, String updatedBy,
                                                   String portalUrl, String logoUrl, Long ticketId) {
        try {
            String template = loadTemplate(TEMPLATE_TICKET_STATUS_UPDATE);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("recipient_name", recipientName != null ? recipientName : "Employee");
            placeholders.put("ticket_number", ticketNumber != null ? ticketNumber : "N/A");
            placeholders.put("ticket_subject", subject != null ? subject : "No Subject");
            placeholders.put("old_status", oldStatus != null ? oldStatus : "N/A");
            placeholders.put("new_status", newStatus != null ? newStatus : "N/A");
            placeholders.put("status_class", getStatusClass(newStatus));
            placeholders.put("updated_by", updatedBy != null ? updatedBy : "System");
            placeholders.put("portal_url", portalUrl != null ? portalUrl : "#");
            placeholders.put("dashboard_link", portalUrl + "/tickets/" + (ticketId != null ? ticketId : ""));
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load ticket status update template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_TICKET_STATUS_UPDATE);
        }
    }

    // ==================== EVENT TEMPLATES ====================

    /**
     * Generate event created email
     */
    public String generateEventCreatedEmail(String employeeName, String eventName, LocalDate eventDate,
                                             LocalTime eventTime, String location, String description,
                                             String createdByName, String portalUrl, String logoUrl, Long eventId) {
        try {
            String template = loadTemplate(TEMPLATE_EVENT_CREATED);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("employee_name", employeeName != null ? employeeName : "Employee");
            placeholders.put("event_name", eventName != null ? eventName : "Event");
            placeholders.put("event_date", eventDate != null ? eventDate.format(DATE_FORMATTER) : "TBD");
            placeholders.put("event_time", eventTime != null ? eventTime.format(TIME_FORMATTER) : "TBD");
            placeholders.put("event_location", location != null && !location.isEmpty() ? location : "To be announced");
            placeholders.put("event_description", description != null && !description.isEmpty() ? description : "No description provided");
            placeholders.put("description_display", description != null && !description.isEmpty() ? "block" : "none");
            placeholders.put("created_by", createdByName != null ? createdByName : "HR Team");
            placeholders.put("portal_url", portalUrl != null ? portalUrl : "#");
            placeholders.put("dashboard_link", portalUrl + "/events/" + (eventId != null ? eventId : ""));
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load event created template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_EVENT_CREATED);
        }
    }

    /**
     * Generate event assigned email
     */
    public String generateEventAssignedEmail(String employeeName, String eventName, LocalDate eventDate,
                                              LocalTime eventTime, String location, String portalUrl, String logoUrl, Long eventId) {
        try {
            String template = loadTemplate(TEMPLATE_EVENT_ASSIGNED);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("employee_name", employeeName != null ? employeeName : "Employee");
            placeholders.put("event_name", eventName != null ? eventName : "Event");
            placeholders.put("event_date", eventDate != null ? eventDate.format(DATE_FORMATTER) : "TBD");
            placeholders.put("event_time", eventTime != null ? eventTime.format(TIME_FORMATTER) : "TBD");
            placeholders.put("event_location", location != null && !location.isEmpty() ? location : "To be announced");
            placeholders.put("portal_url", portalUrl != null ? portalUrl : "#");
            placeholders.put("dashboard_link", portalUrl + "/events/" + (eventId != null ? eventId : ""));
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load event assigned template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_EVENT_ASSIGNED);
        }
    }

    // ==================== PROJECT TEMPLATES ====================

    /**
     * Generate project assigned email
     */
    public String generateProjectAssignedEmail(String employeeName, String projectName, String projectCode,
                                                LocalDate startDate, LocalDate deadline, String projectAdminName,
                                                String portalUrl, String logoUrl, Long projectId) {
        try {
            String template = loadTemplate(TEMPLATE_PROJECT_ASSIGNED);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("employee_name", employeeName != null ? employeeName : "Employee");
            placeholders.put("project_name", projectName != null ? projectName : "Project");
            placeholders.put("project_code", projectCode != null ? projectCode : "N/A");
            placeholders.put("start_date", startDate != null ? startDate.format(DATE_FORMATTER) : "TBD");
            placeholders.put("deadline", deadline != null ? deadline.format(DATE_FORMATTER) : "TBD");
            placeholders.put("start_date_display", startDate != null ? "table-row" : "none");
            placeholders.put("deadline_display", deadline != null ? "table-row" : "none");
            placeholders.put("project_admin", projectAdminName != null ? projectAdminName : "Project Manager");
            placeholders.put("portal_url", portalUrl != null ? portalUrl : "#");
            placeholders.put("dashboard_link", portalUrl + "/work/projects/" + (projectId != null ? projectId : ""));
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load project assigned template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_PROJECT_ASSIGNED);
        }
    }

    // ==================== TASK TEMPLATES ====================

    /**
     * Generate task assigned email
     */
    public String generateTaskAssignedEmail(String employeeName, String taskTitle, String taskCode,
                                             String projectName, String priority, LocalDate dueDate,
                                             String assignedByName, String portalUrl, String logoUrl, Long taskId) {
        try {
            String template = loadTemplate(TEMPLATE_TASK_ASSIGNED);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("employee_name", employeeName != null ? employeeName : "Employee");
            placeholders.put("task_title", taskTitle != null ? taskTitle : "Task");
            placeholders.put("task_code", taskCode != null ? taskCode : "N/A");
            placeholders.put("project_name", projectName != null && !projectName.isEmpty() ? projectName : "No Project");
            placeholders.put("project_display", projectName != null && !projectName.isEmpty() ? "table-row" : "none");
            placeholders.put("priority", priority != null ? priority : "MEDIUM");
            placeholders.put("priority_class", getPriorityClass(priority));
            placeholders.put("due_date", dueDate != null ? dueDate.format(DATE_FORMATTER) : "No due date");
            placeholders.put("due_date_display", dueDate != null ? "table-row" : "none");
            placeholders.put("assigned_by", assignedByName != null ? assignedByName : "Manager");
            placeholders.put("portal_url", portalUrl != null ? portalUrl : "#");
            placeholders.put("dashboard_link", portalUrl + "/work/tasks/" + (taskId != null ? taskId : ""));
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load task assigned template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_TASK_ASSIGNED);
        }
    }

    // ==================== SHIFT ROSTER TEMPLATES ====================

    /**
     * Generate shift assigned email
     */
    public String generateShiftAssignedEmail(String employeeName, String shiftName, LocalTime startTime,
                                              LocalTime endTime, LocalDate shiftDate, String remark,
                                              String portalUrl, String logoUrl) {
        try {
            String template = loadTemplate(TEMPLATE_SHIFT_ASSIGNED);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("employee_name", employeeName != null ? employeeName : "Employee");
            placeholders.put("shift_name", shiftName != null ? shiftName : "Shift");
            placeholders.put("shift_start", startTime != null ? startTime.format(TIME_FORMATTER) : "TBD");
            placeholders.put("shift_end", endTime != null ? endTime.format(TIME_FORMATTER) : "TBD");
            placeholders.put("shift_date", shiftDate != null ? shiftDate.format(DATE_FORMATTER) : "TBD");
            placeholders.put("remark", remark != null && !remark.isEmpty() ? remark : "");
            placeholders.put("remark_display", remark != null && !remark.isEmpty() ? "block" : "none");
            placeholders.put("portal_url", portalUrl != null ? portalUrl : "#");
            placeholders.put("dashboard_link", portalUrl + "/shift-roster");
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load shift assigned template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_SHIFT_ASSIGNED);
        }
    }

    /**
     * Generate shift updated email
     */
    public String generateShiftUpdatedEmail(String employeeName, String oldShiftName, String newShiftName,
                                             LocalTime newStartTime, LocalTime newEndTime, LocalDate shiftDate,
                                             String remark, String portalUrl, String logoUrl) {
        try {
            String template = loadTemplate(TEMPLATE_SHIFT_UPDATED);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("employee_name", employeeName != null ? employeeName : "Employee");
            placeholders.put("old_shift_name", oldShiftName != null ? oldShiftName : "Previous Shift");
            placeholders.put("new_shift_name", newShiftName != null ? newShiftName : "New Shift");
            placeholders.put("shift_start", newStartTime != null ? newStartTime.format(TIME_FORMATTER) : "TBD");
            placeholders.put("shift_end", newEndTime != null ? newEndTime.format(TIME_FORMATTER) : "TBD");
            placeholders.put("shift_date", shiftDate != null ? shiftDate.format(DATE_FORMATTER) : "TBD");
            placeholders.put("remark", remark != null && !remark.isEmpty() ? remark : "");
            placeholders.put("remark_display", remark != null && !remark.isEmpty() ? "block" : "none");
            placeholders.put("portal_url", portalUrl != null ? portalUrl : "#");
            placeholders.put("dashboard_link", portalUrl + "/shift-roster");
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load shift updated template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_SHIFT_UPDATED);
        }
    }

    // ==================== HOLIDAY TEMPLATES ====================

    /**
     * Generate holiday announcement email
     */
    public String generateHolidayAnnouncementEmail(String employeeName, String occasion, LocalDate holidayDate,
                                                    boolean isCommon, String portalUrl, String logoUrl, Long holidayId) {
        try {
            String template = loadTemplate(TEMPLATE_HOLIDAY_ANNOUNCEMENT);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("employee_name", employeeName != null ? employeeName : "Employee");
            placeholders.put("occasion", occasion != null ? occasion : "Holiday");
            placeholders.put("holiday_date", holidayDate != null ? holidayDate.format(DATE_FORMATTER) : "TBD");
            placeholders.put("holiday_type", isCommon ? "Company-wide Holiday" : "Department/Role Specific Holiday");
            placeholders.put("portal_url", portalUrl != null ? portalUrl : "#");
            placeholders.put("dashboard_link", portalUrl + "/holidays/" + (holidayId != null ? holidayId : ""));
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load holiday announcement template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_HOLIDAY_ANNOUNCEMENT);
        }
    }

    // ==================== HELPER METHODS ====================

    private String getPriorityClass(String priority) {
        if (priority == null) return "priority-low";
        return switch (priority.toUpperCase()) {
            case "HIGH", "URGENT" -> "priority-high";
            case "MEDIUM" -> "priority-medium";
            default -> "priority-low";
        };
    }

    private String getStatusClass(String status) {
        if (status == null) return "status-pending";
        return switch (status.toUpperCase()) {
            case "RESOLVED", "COMPLETED", "APPROVED" -> "status-resolved";
            case "CLOSED" -> "status-closed";
            case "OPEN", "PENDING" -> "status-pending";
            case "REJECTED" -> "status-rejected";
            default -> "status-pending";
        };
    }
}
