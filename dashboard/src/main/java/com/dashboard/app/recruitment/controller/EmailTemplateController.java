package com.dashboard.app.recruitment.controller;

import com.dashboard.app.recruitment.service.EmailTemplateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/recruitment/email-templates")
@CrossOrigin(origins = "*")
public class EmailTemplateController {

    @Autowired
    private EmailTemplateService emailTemplateService;

    @Value("${server.port:8080}")
    private String serverPort;

    @Value("${server.address:localhost}")
    private String serverAddress;

    @Value("${app.email.logo-url:}")
    private String configuredLogoUrl;

    /**
     * Get list of available email templates
     */
    @GetMapping("/list")
    public ResponseEntity<Map<String, Object>> getTemplateList() {
        Map<String, Object> templates = new HashMap<>();
        templates.put("templates", new String[]{
            EmailTemplateService.TEMPLATE_ACCOUNT_CREATION,
            EmailTemplateService.TEMPLATE_PROFILE_REMINDER,
            EmailTemplateService.TEMPLATE_INTERVIEW_SCHEDULED,
            EmailTemplateService.TEMPLATE_INTERVIEW_TECHNICAL,
            EmailTemplateService.TEMPLATE_INTERVIEW_HR,
            EmailTemplateService.TEMPLATE_INTERVIEW_RESCHEDULED,
            EmailTemplateService.TEMPLATE_INTERVIEW_FEEDBACK,
            EmailTemplateService.TEMPLATE_OFFER_LETTER,
            EmailTemplateService.TEMPLATE_GENERAL,
            EmailTemplateService.TEMPLATE_REJECTION
        });
        return ResponseEntity.ok(templates);
    }

    /**
     * Preview email template with sample data
     */
    @GetMapping("/preview/{templateName}")
    public ResponseEntity<Map<String, String>> previewTemplate(@PathVariable String templateName) {
        try {
            // Construct logo URL - in production, this should be the actual public URL
            String logoUrl = buildLogoUrl();
            
            String htmlContent = emailTemplateService.previewTemplate(templateName, logoUrl);
            
            Map<String, String> response = new HashMap<>();
            response.put("html", htmlContent);
            response.put("templateName", templateName);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to preview template: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Preview email template with custom data
     */
    @PostMapping("/preview/{templateName}")
    public ResponseEntity<Map<String, String>> previewTemplateWithData(
            @PathVariable String templateName,
            @RequestBody Map<String, Object> data) {
        try {
            String logoUrl = buildLogoUrl();
            String htmlContent = generateTemplateWithData(templateName, data, logoUrl);
            
            Map<String, String> response = new HashMap<>();
            response.put("html", htmlContent);
            response.put("templateName", templateName);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to preview template: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * Generate template with custom data
     */
    private String generateTemplateWithData(String templateName, Map<String, Object> data, String logoUrl) {
        switch (templateName) {
            case EmailTemplateService.TEMPLATE_ACCOUNT_CREATION:
                return emailTemplateService.generateAccountCreationEmail(
                    getString(data, "candidate_name"),
                    getString(data, "portal_url"),
                    logoUrl
                );
            case EmailTemplateService.TEMPLATE_PROFILE_REMINDER:
                return emailTemplateService.generateProfileReminderEmail(
                    getString(data, "candidate_name"),
                    getString(data, "profile_url"),
                    logoUrl
                );
            case EmailTemplateService.TEMPLATE_INTERVIEW_SCHEDULED:
                return emailTemplateService.generateInterviewScheduledEmail(
                    getString(data, "candidate_name"),
                    getString(data, "job_title"),
                    getLocalDate(data, "interview_date"),
                    getLocalTime(data, "interview_time"),
                    getString(data, "interviewer_name"),
                    getString(data, "interview_round"),
                    logoUrl
                );
            case EmailTemplateService.TEMPLATE_INTERVIEW_TECHNICAL:
                return emailTemplateService.generateTechnicalInterviewScheduledEmail(
                    getString(data, "candidate_name"),
                    getString(data, "job_title"),
                    getLocalDate(data, "interview_date"),
                    getLocalTime(data, "interview_time"),
                    getString(data, "interviewer_name"),
                    getString(data, "interview_round"),
                    logoUrl
                );
            case EmailTemplateService.TEMPLATE_INTERVIEW_HR:
                return emailTemplateService.generateHrInterviewScheduledEmail(
                    getString(data, "candidate_name"),
                    getString(data, "job_title"),
                    getLocalDate(data, "interview_date"),
                    getLocalTime(data, "interview_time"),
                    getString(data, "interviewer_name"),
                    getString(data, "interview_round"),
                    logoUrl
                );
            case EmailTemplateService.TEMPLATE_INTERVIEW_RESCHEDULED:
                return emailTemplateService.generateInterviewRescheduledEmail(
                    getString(data, "candidate_name"),
                    getString(data, "job_title"),
                    getLocalDate(data, "old_interview_date"),
                    getLocalTime(data, "old_interview_time"),
                    getLocalDate(data, "interview_date"),
                    getLocalTime(data, "interview_time"),
                    getString(data, "interviewer_name"),
                    getString(data, "interview_round"),
                    logoUrl
                );
            case EmailTemplateService.TEMPLATE_INTERVIEW_FEEDBACK:
                return emailTemplateService.generateInterviewFeedbackEmail(
                    getString(data, "candidate_name"),
                    getString(data, "job_title"),
                    getLocalDate(data, "interview_date"),
                    getString(data, "interviewer_name"),
                    getString(data, "interview_round"),
                    getString(data, "result"),
                    getString(data, "feedback_remarks"),
                    getString(data, "next_steps"),
                    getString(data, "portal_url"),
                    logoUrl
                );
            case EmailTemplateService.TEMPLATE_OFFER_LETTER:
                return emailTemplateService.generateOfferLetterEmail(
                    getString(data, "candidate_name"),
                    getString(data, "job_title"),
                    getString(data, "department"),
                    getLocalDate(data, "offer_date"),
                    getLocalDate(data, "joining_date"),
                    getString(data, "employee_id"),
                    getString(data, "offer_letter_url"),
                    getString(data, "portal_url"),
                    logoUrl
                );
            case EmailTemplateService.TEMPLATE_GENERAL:
                return emailTemplateService.generateGeneralNotificationEmail(
                    getString(data, "candidate_name"),
                    getString(data, "notification_subject"),
                    getString(data, "notification_message"),
                    getString(data, "job_title"),
                    getString(data, "application_status"),
                    getString(data, "additional_info"),
                    getString(data, "action_url"),
                    getString(data, "action_button_text"),
                    getString(data, "recruiter_name"),
                    logoUrl
                );
            case EmailTemplateService.TEMPLATE_REJECTION:
                return emailTemplateService.generateRejectionEmail(
                    getString(data, "candidate_name"),
                    getString(data, "job_title"),
                    logoUrl
                );
            default:
                throw new IllegalArgumentException("Unknown template: " + templateName);
        }
    }

    /**
     * Build logo URL for email templates
     * In production, this should point to the actual public URL
     */
    private String buildLogoUrl() {
        // If configured logo URL is provided, use it
        if (configuredLogoUrl != null && !configuredLogoUrl.isEmpty()) {
            return configuredLogoUrl;
        }
        
        // For preview, construct URL that works with the file serving endpoint
        // In production emails, this should be an absolute URL pointing to a publicly accessible location
        String baseUrl = "http://" + serverAddress + ":" + serverPort;
        
        // Try to use the logo from frontend/public if accessible
        // Note: In production, configure app.email.logo-url to point to a publicly accessible CDN or static file server
        return baseUrl + "/api/files?path=frontend/public/logo.jpeg";
    }

    // Helper methods to extract data from map
    private String getString(Map<String, Object> data, String key) {
        Object value = data.get(key);
        return value != null ? value.toString() : null;
    }

    private LocalDate getLocalDate(Map<String, Object> data, String key) {
        Object value = data.get(key);
        if (value == null) return null;
        if (value instanceof String) {
            return LocalDate.parse((String) value);
        }
        return null;
    }

    private LocalTime getLocalTime(Map<String, Object> data, String key) {
        Object value = data.get(key);
        if (value == null) return null;
        if (value instanceof String) {
            return LocalTime.parse((String) value);
        }
        return null;
    }
}
