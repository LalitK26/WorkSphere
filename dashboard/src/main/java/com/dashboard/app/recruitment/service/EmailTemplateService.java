package com.dashboard.app.recruitment.service;

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

@Service
public class EmailTemplateService {

    private static final Logger logger = LoggerFactory.getLogger(EmailTemplateService.class);
    private static final String TEMPLATE_BASE_PATH = "email-templates/";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("MMMM dd, yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("hh:mm a");

    // Template file names
    public static final String TEMPLATE_ACCOUNT_CREATION = "account-creation-confirmation";
    public static final String TEMPLATE_EMAIL_VERIFICATION = "verification-email";
    public static final String TEMPLATE_PROFILE_REMINDER = "profile-completion-reminder";
    public static final String TEMPLATE_INTERVIEW_SCHEDULED = "interview-scheduled";
    public static final String TEMPLATE_INTERVIEW_TECHNICAL = "technical-interview-scheduled";
    public static final String TEMPLATE_INTERVIEW_HR = "hr-interview-scheduled";
    public static final String TEMPLATE_INTERVIEW_RESCHEDULED = "interview-rescheduled";
    public static final String TEMPLATE_INTERVIEW_FEEDBACK = "interview-feedback-update";
    public static final String TEMPLATE_OFFER_LETTER = "offer-letter-issued";
    public static final String TEMPLATE_GENERAL = "general-recruitment-notification";
    public static final String TEMPLATE_FORGOT_PASSWORD_OTP = "forgot-password-otp";
    public static final String TEMPLATE_DOCUMENT_UPLOAD = "document-upload-required";
    public static final String TEMPLATE_REJECTION = "rejection-email";
    public static final String TEMPLATE_SIGNUP_OTP = "signup-otp";

    // Default company information
    private static final String DEFAULT_COMPANY_NAME = "Thynk Technology India";
    private static final String DEFAULT_COMPANY_WEBSITE = "https://worksphere.com";
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
        placeholders.put("logo_url", logoUrl != null ? logoUrl : "");
        return placeholders;
    }

    /**
     * Generate account creation confirmation email
     */
    public String generateAccountCreationEmail(String candidateName, String portalUrl, String logoUrl) {
        try {
            String template = loadTemplate(TEMPLATE_ACCOUNT_CREATION);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("candidate_name", candidateName != null ? candidateName : "Candidate");
            placeholders.put("portal_url", portalUrl != null ? portalUrl : "#");
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load account creation template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_ACCOUNT_CREATION);
        }
    }

    /**
     * Generate verification email
     */
    public String generateVerificationEmail(String candidateName, String verificationLink, String logoUrl) {
        try {
            String template = loadTemplate(TEMPLATE_EMAIL_VERIFICATION);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("candidate_name", candidateName != null ? candidateName : "Candidate");
            placeholders.put("verification_link", verificationLink != null ? verificationLink : "#");
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load verification template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_EMAIL_VERIFICATION);
        }
    }


    /**
     * Generate profile completion reminder email
     */
    public String generateProfileReminderEmail(String candidateName, String profileUrl, String logoUrl) {
        try {
            String template = loadTemplate(TEMPLATE_PROFILE_REMINDER);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("candidate_name", candidateName != null ? candidateName : "Candidate");
            placeholders.put("profile_url", profileUrl != null ? profileUrl : "#");
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load profile reminder template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_PROFILE_REMINDER);
        }
    }

    /**
     * Generate generic interview scheduled email (legacy – used for backward compatibility)
     */
    public String generateInterviewScheduledEmail(
            String candidateName, String jobTitle, LocalDate interviewDate, LocalTime interviewTime,
            String interviewerName, String interviewRound, String logoUrl) {
        try {
            String template = loadTemplate(TEMPLATE_INTERVIEW_SCHEDULED);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("candidate_name", candidateName != null ? candidateName : "Candidate");
            placeholders.put("job_title", jobTitle != null ? jobTitle : "Position");
            placeholders.put("interview_date", interviewDate != null ? interviewDate.format(DATE_FORMATTER) : "TBD");
            placeholders.put("interview_time", interviewTime != null ? interviewTime.format(TIME_FORMATTER) : "TBD");
            placeholders.put("interviewer_name", interviewerName != null ? interviewerName : "Interviewer");
            placeholders.put("interview_round", interviewRound != null ? interviewRound : "");
            
            // Handle conditional display
            placeholders.put("interview_round_display", interviewRound != null && !interviewRound.isEmpty() ? "flex" : "none");
            
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load interview scheduled template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_INTERVIEW_SCHEDULED);
        }
    }

    /**
     * Generate technical interview scheduled email
     */
    public String generateTechnicalInterviewScheduledEmail(
            String candidateName, String jobTitle, LocalDate interviewDate, LocalTime interviewTime,
            String interviewerName, String interviewRound, String logoUrl) {
        try {
            String template = loadTemplate(TEMPLATE_INTERVIEW_TECHNICAL);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("candidate_name", candidateName != null ? candidateName : "Candidate");
            placeholders.put("job_title", jobTitle != null ? jobTitle : "Position");
            placeholders.put("interview_date", interviewDate != null ? interviewDate.format(DATE_FORMATTER) : "TBD");
            placeholders.put("interview_time", interviewTime != null ? interviewTime.format(TIME_FORMATTER) : "TBD");
            placeholders.put("interviewer_name", interviewerName != null ? interviewerName : "Interviewer");
            placeholders.put("interview_round", interviewRound != null ? interviewRound : "Technical");

            // Handle conditional display
            placeholders.put("interview_round_display", interviewRound != null && !interviewRound.isEmpty() ? "flex" : "none");

            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load technical interview scheduled template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_INTERVIEW_TECHNICAL);
        }
    }

    /**
     * Generate HR interview scheduled email
     */
    public String generateHrInterviewScheduledEmail(
            String candidateName, String jobTitle, LocalDate interviewDate, LocalTime interviewTime,
            String interviewerName, String interviewRound, String logoUrl) {
        try {
            String template = loadTemplate(TEMPLATE_INTERVIEW_HR);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("candidate_name", candidateName != null ? candidateName : "Candidate");
            placeholders.put("job_title", jobTitle != null ? jobTitle : "Position");
            placeholders.put("interview_date", interviewDate != null ? interviewDate.format(DATE_FORMATTER) : "TBD");
            placeholders.put("interview_time", interviewTime != null ? interviewTime.format(TIME_FORMATTER) : "TBD");
            placeholders.put("interviewer_name", interviewerName != null ? interviewerName : "HR Team");
            placeholders.put("interview_round", interviewRound != null ? interviewRound : "HR");

            // Handle conditional display
            placeholders.put("interview_round_display", interviewRound != null && !interviewRound.isEmpty() ? "flex" : "none");

            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load HR interview scheduled template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_INTERVIEW_HR);
        }
    }

    /**
     * Generate interview rescheduled email
     */
    public String generateInterviewRescheduledEmail(
            String candidateName, String jobTitle, 
            LocalDate oldDate, LocalTime oldTime, LocalDate newDate, LocalTime newTime,
            String interviewerName, String interviewRound, String logoUrl) {
        try {
            String template = loadTemplate(TEMPLATE_INTERVIEW_RESCHEDULED);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("candidate_name", candidateName != null ? candidateName : "Candidate");
            placeholders.put("job_title", jobTitle != null ? jobTitle : "Position");
            placeholders.put("old_interview_date", oldDate != null ? oldDate.format(DATE_FORMATTER) : "");
            placeholders.put("old_interview_time", oldTime != null ? oldTime.format(TIME_FORMATTER) : "");
            placeholders.put("interview_date", newDate != null ? newDate.format(DATE_FORMATTER) : "TBD");
            placeholders.put("interview_time", newTime != null ? newTime.format(TIME_FORMATTER) : "TBD");
            placeholders.put("interviewer_name", interviewerName != null ? interviewerName : "Interviewer");
            placeholders.put("interview_round", interviewRound != null ? interviewRound : "");
            
            // Handle conditional display
            placeholders.put("interview_round_display", interviewRound != null && !interviewRound.isEmpty() ? "flex" : "none");
            
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load interview rescheduled template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_INTERVIEW_RESCHEDULED);
        }
    }

    /**
     * Generate interview feedback update email
     */
    public String generateInterviewFeedbackEmail(
            String candidateName, String jobTitle, LocalDate interviewDate,
            String interviewerName, String interviewRound, String result, 
            String feedbackRemarks, String nextSteps, String portalUrl, String logoUrl) {
        try {
            String template = loadTemplate(TEMPLATE_INTERVIEW_FEEDBACK);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("candidate_name", candidateName != null ? candidateName : "Candidate");
            placeholders.put("job_title", jobTitle != null ? jobTitle : "Position");
            placeholders.put("interview_date", interviewDate != null ? interviewDate.format(DATE_FORMATTER) : "");
            placeholders.put("interviewer_name", interviewerName != null ? interviewerName : "Interviewer");
            placeholders.put("interview_round", interviewRound != null ? interviewRound : "");
            placeholders.put("interview_result", result != null ? result : "Pending");
            placeholders.put("feedback_remarks", feedbackRemarks != null ? feedbackRemarks : "");
            placeholders.put("next_steps", nextSteps != null ? nextSteps : "");
            placeholders.put("portal_url", portalUrl != null ? portalUrl : "#");
            
            // Determine result badge class
            String resultClass = "result-pending";
            if (result != null) {
                String resultLower = result.toLowerCase();
                if (resultLower.contains("pass") || resultLower.contains("selected") || resultLower.contains("approved")) {
                    resultClass = "result-passed";
                } else if (resultLower.contains("select")) {
                    resultClass = "result-selected";
                }
            }
            placeholders.put("result_class", resultClass);
            
            // Handle conditional display
            placeholders.put("feedback_remarks_display", feedbackRemarks != null && !feedbackRemarks.isEmpty() ? "block" : "none");
            placeholders.put("next_steps_display", nextSteps != null && !nextSteps.isEmpty() ? "block" : "none");
            
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load interview feedback template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_INTERVIEW_FEEDBACK);
        }
    }

    /**
     * Generate offer letter issued email
     */
    public String generateOfferLetterEmail(
            String candidateName, String jobTitle, String department,
            LocalDate offerDate, LocalDate joiningDate, String employeeId,
            String offerLetterUrl, String portalUrl, String logoUrl) {
        try {
            String template = loadTemplate(TEMPLATE_OFFER_LETTER);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("candidate_name", candidateName != null ? candidateName : "Candidate");
            placeholders.put("job_title", jobTitle != null ? jobTitle : "Position");
            placeholders.put("department", department != null ? department : "");
            placeholders.put("offer_date", offerDate != null ? offerDate.format(DATE_FORMATTER) : "");
            placeholders.put("joining_date", joiningDate != null ? joiningDate.format(DATE_FORMATTER) : "");
            placeholders.put("employee_id", employeeId != null ? employeeId : "");
            placeholders.put("offer_letter_url", offerLetterUrl != null ? offerLetterUrl : "#");
            placeholders.put("portal_url", portalUrl != null ? portalUrl : "#");
            
            // Handle conditional display
            placeholders.put("offer_date_display", offerDate != null ? "table-row" : "none");
            placeholders.put("joining_date_display", joiningDate != null ? "table-row" : "none");
            placeholders.put("employee_id_display", employeeId != null && !employeeId.isEmpty() ? "table-row" : "none");
            
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load offer letter template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_OFFER_LETTER);
        }
    }

    /**
     * Generate general recruitment notification email
     */
    public String generateGeneralNotificationEmail(
            String candidateName, String notificationSubject, String notificationMessage,
            String jobTitle, String applicationStatus, String additionalInfo,
            String actionUrl, String actionButtonText, String recruiterName, String logoUrl) {
        try {
            String template = loadTemplate(TEMPLATE_GENERAL);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("candidate_name", candidateName != null ? candidateName : "Candidate");
            placeholders.put("notification_subject", notificationSubject != null ? notificationSubject : "");
            placeholders.put("notification_message", notificationMessage != null ? notificationMessage : "");
            placeholders.put("job_title", jobTitle != null ? jobTitle : "");
            placeholders.put("application_status", applicationStatus != null ? applicationStatus : "");
            placeholders.put("additional_info", additionalInfo != null ? additionalInfo : "");
            placeholders.put("action_url", actionUrl != null ? actionUrl : "#");
            placeholders.put("action_button_text", actionButtonText != null ? actionButtonText : "View Details");
            placeholders.put("recruiter_name", recruiterName != null ? recruiterName : DEFAULT_COMPANY_NAME + " Team");
            
            // Handle conditional display
            placeholders.put("notification_subject_display", notificationSubject != null && !notificationSubject.isEmpty() ? "block" : "none");
            placeholders.put("default_message_display", notificationSubject == null || notificationSubject.isEmpty() ? "block" : "none");
            placeholders.put("job_title_display", jobTitle != null && !jobTitle.isEmpty() ? "block" : "none");
            placeholders.put("application_status_display", applicationStatus != null && !applicationStatus.isEmpty() ? "flex" : "none");
            placeholders.put("additional_info_display", additionalInfo != null && !additionalInfo.isEmpty() ? "block" : "none");
            placeholders.put("default_info_display", additionalInfo == null || additionalInfo.isEmpty() ? "block" : "none");
            placeholders.put("action_url_display", actionUrl != null && !actionUrl.isEmpty() ? "block" : "none");
            
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load general notification template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_GENERAL);
        }
    }

    /**
     * Generate forgot-password OTP email (OTP, validity duration, security disclaimer).
     */
    public String generateForgotPasswordOtpEmail(String otp, int validityMinutes, String logoUrl) {
        try {
            String template = loadTemplate(TEMPLATE_FORGOT_PASSWORD_OTP);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("otp", otp != null ? otp : "");
            String validityMsg = validityMinutes <= 1
                    ? "This code is valid for 1 minute."
                    : "This code is valid for " + validityMinutes + " minutes.";
            placeholders.put("validity_message", validityMsg);
            placeholders.put("security_disclaimer",
                    "This system is restricted to authorized personnel. All password reset activities are logged and monitored for security purposes. Never share your OTP or password with anyone.");
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load forgot-password OTP template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_FORGOT_PASSWORD_OTP);
        }
    }

    /**
     * Generate signup OTP email.
     */
    public String generateSignupOtpEmail(String candidateName, String otp, int validityMinutes, String logoUrl) {
        try {
            String template = loadTemplate(TEMPLATE_SIGNUP_OTP);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("candidate_name", candidateName != null ? candidateName : "User");
            placeholders.put("otp", otp != null ? otp : "");
            String validityMsg = validityMinutes <= 1
                    ? "Valid for 1 minute."
                    : "Valid for " + validityMinutes + " minutes.";
            placeholders.put("validity_message", validityMsg);
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load signup OTP template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_SIGNUP_OTP);
        }
    }

    /**
     * Generate document upload required email
     */
    /**
     * Generate document upload required email
     */
    public String generateDocumentUploadRequiredEmail(
            String candidateName, String jobTitle, String documentsUrl, String logoUrl) {
        try {
            String template = loadTemplate(TEMPLATE_DOCUMENT_UPLOAD);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("candidate_name", candidateName != null ? candidateName : "Candidate");
            placeholders.put("job_title", jobTitle != null ? jobTitle : "Position");
            placeholders.put("documents_url", documentsUrl != null ? documentsUrl : "#");
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load document upload template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_DOCUMENT_UPLOAD);
        }
    }

    /**
     * Generate rejection email
     */
    public String generateRejectionEmail(
            String candidateName, String jobTitle, String logoUrl) {
        try {
            String template = loadTemplate(TEMPLATE_REJECTION);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            placeholders.put("candidate_name", candidateName != null ? candidateName : "Candidate");
            placeholders.put("job_title", jobTitle != null ? jobTitle : "Position");
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to load rejection email template", e);
            throw new ResourceNotFoundException("Email template not found: " + TEMPLATE_REJECTION);
        }
    }

    /**
     * Preview template with sample data
     */
    public String previewTemplate(String templateName, String logoUrl) {
        try {
            String template = loadTemplate(templateName);
            Map<String, String> placeholders = getDefaultPlaceholders(logoUrl);
            
            // Sample data for preview
            switch (templateName) {
                case TEMPLATE_ACCOUNT_CREATION:
                    placeholders.put("candidate_name", "John Doe");
                    placeholders.put("portal_url", "https://portal.example.com");
                    break;
                case TEMPLATE_PROFILE_REMINDER:
                    placeholders.put("candidate_name", "John Doe");
                    placeholders.put("profile_url", "https://portal.example.com/profile");
                    break;
                case TEMPLATE_INTERVIEW_SCHEDULED:
                    placeholders.put("candidate_name", "John Doe");
                    placeholders.put("job_title", "Software Engineer");
                    placeholders.put("interview_date", LocalDate.now().plusDays(7).format(DATE_FORMATTER));
                    placeholders.put("interview_time", LocalTime.of(14, 0).format(TIME_FORMATTER));
                    placeholders.put("interviewer_name", "Jane Smith");
                    placeholders.put("interview_round", "Technical Round");
                    placeholders.put("interview_round_display", "flex");
                    placeholders.put("recruiter_name", "Jane Smith");
                    break;
                case TEMPLATE_INTERVIEW_RESCHEDULED:
                    placeholders.put("candidate_name", "John Doe");
                    placeholders.put("job_title", "Software Engineer");
                    placeholders.put("old_interview_date", LocalDate.now().plusDays(5).format(DATE_FORMATTER));
                    placeholders.put("old_interview_time", LocalTime.of(10, 0).format(TIME_FORMATTER));
                    placeholders.put("interview_date", LocalDate.now().plusDays(10).format(DATE_FORMATTER));
                    placeholders.put("interview_time", LocalTime.of(14, 0).format(TIME_FORMATTER));
                    placeholders.put("interviewer_name", "Jane Smith");
                    placeholders.put("interview_round", "Technical Round");
                    placeholders.put("interview_round_display", "flex");
                    placeholders.put("recruiter_name", "Jane Smith");
                    break;
                case TEMPLATE_INTERVIEW_FEEDBACK:
                    placeholders.put("candidate_name", "John Doe");
                    placeholders.put("job_title", "Software Engineer");
                    placeholders.put("interview_date", LocalDate.now().minusDays(2).format(DATE_FORMATTER));
                    placeholders.put("interviewer_name", "Jane Smith");
                    placeholders.put("interview_round", "Technical Round");
                    placeholders.put("interview_result", "PASSED");
                    placeholders.put("feedback_remarks", "Excellent technical skills and problem-solving ability. Strong communication and cultural fit.");
                    placeholders.put("next_steps", "You will proceed to the HR round. We will contact you shortly to schedule the next interview.");
                    placeholders.put("portal_url", "https://portal.example.com");
                    placeholders.put("result_class", "result-passed");
                    placeholders.put("feedback_remarks_display", "block");
                    placeholders.put("next_steps_display", "block");
                    placeholders.put("recruiter_name", "Jane Smith");
                    break;
                case TEMPLATE_OFFER_LETTER:
                    placeholders.put("candidate_name", "John Doe");
                    placeholders.put("job_title", "Software Engineer");
                    placeholders.put("department", "Engineering");
                    placeholders.put("offer_date", LocalDate.now().format(DATE_FORMATTER));
                    placeholders.put("joining_date", LocalDate.now().plusDays(30).format(DATE_FORMATTER));
                    placeholders.put("employee_id", "EMP-2024-001");
                    placeholders.put("offer_letter_url", "https://portal.example.com/offer-letter");
                    placeholders.put("portal_url", "https://portal.example.com");
                    placeholders.put("offer_date_display", "flex");
                    placeholders.put("joining_date_display", "flex");
                    placeholders.put("employee_id_display", "flex");
                    placeholders.put("recruiter_name", "Jane Smith");
                    break;
                case TEMPLATE_GENERAL:
                    placeholders.put("candidate_name", "John Doe");
                    placeholders.put("notification_subject", "Application Status Update");
                    placeholders.put("notification_message", "Your application has been reviewed and is currently under consideration. We will update you soon.");
                    placeholders.put("job_title", "Software Engineer");
                    placeholders.put("application_status", "Under Review");
                    placeholders.put("additional_info", "Please ensure your profile is complete to expedite the process.");
                    placeholders.put("action_url", "https://portal.example.com/application");
                    placeholders.put("action_button_text", "View Application");
                    placeholders.put("recruiter_name", "Jane Smith");
                    placeholders.put("notification_subject_display", "block");
                    placeholders.put("default_message_display", "none");
                    placeholders.put("job_title_display", "block");
                    placeholders.put("application_status_display", "flex");
                    placeholders.put("additional_info_display", "block");
                    placeholders.put("default_info_display", "none");
                    placeholders.put("action_url_display", "block");
                    break;
                case TEMPLATE_DOCUMENT_UPLOAD:
                    placeholders.put("candidate_name", "John Doe");
                    placeholders.put("job_title", "Software Engineer");
                    placeholders.put("documents_url", "https://portal.example.com/my-offers/documents");
                    placeholders.put("recruiter_name", "Jane Smith");
                    break;
                case TEMPLATE_REJECTION:
                    placeholders.put("candidate_name", "John Doe");
                    placeholders.put("job_title", "Software Engineer");
                    break;
            }
            
            return replacePlaceholders(template, placeholders);
        } catch (IOException e) {
            logger.error("Failed to preview template: " + templateName, e);
            throw new ResourceNotFoundException("Email template not found: " + templateName);
        }
    }
}
