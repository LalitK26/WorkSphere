package com.dashboard.app.recruitment.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Recruitment email delivery using GoDaddy SMTP (smtpout.secureserver.net:465 SSL/TLS).
 * Uses shared JavaMailSender configured for GoDaddy. Reuses existing email templates
 * with embedded logos. Failures are logged; operations never throw to keep
 * recruitment/dashboard flows unaffected.
 */
@Service
public class RecruitmentEmailService {

    private static final Logger logger = LoggerFactory.getLogger(RecruitmentEmailService.class);
    private static final String INLINE_LOGO_CID = "thynk-logo";
    private static final String INLINE_LOGO_SRC = "cid:" + INLINE_LOGO_CID;
    private static volatile byte[] INLINE_LOGO_BYTES;

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private EmailTemplateService emailTemplateService;

    @Autowired
    private OfferTemplateService offerTemplateService;

    @Autowired
    private OfferPdfService offerPdfService;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.email.logo-url:}")
    private String logoUrl;

    @Value("${app.recruitment.portal-url:https://recruitment.worksphere.ltd}")
    private String portalUrl;

    @Value("${app.recruitment.offer-base-url:https://recruitment.worksphere.ltd/api/recruitment/offers}")
    private String offerBaseUrl;

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private byte[] getInlineLogoBytesOrNull() {
        byte[] cached = INLINE_LOGO_BYTES;
        if (cached != null) return cached.length == 0 ? null : cached;

        synchronized (RecruitmentEmailService.class) {
            if (INLINE_LOGO_BYTES != null) return INLINE_LOGO_BYTES.length == 0 ? null : INLINE_LOGO_BYTES;

            // Try classpath first (optional if you later add it as a resource)
            try {
                ClassPathResource cp = new ClassPathResource("email-assets/white_logo.png");
                if (cp.exists()) {
                    INLINE_LOGO_BYTES = cp.getInputStream().readAllBytes();
                    return INLINE_LOGO_BYTES.length == 0 ? null : INLINE_LOGO_BYTES;
                }
            } catch (Exception ignored) {
                // fall through
            }

            // Fallback: monorepo filesystem path (dev / typical deployments that include repo)
            Path[] candidates = new Path[]{
                    Paths.get("frontend", "src", "assets", "white_logo.png"),
                    Paths.get("..", "frontend", "src", "assets", "white_logo.png"),
                    Paths.get(".", "frontend", "src", "assets", "white_logo.png")
            };

            for (Path p : candidates) {
                try {
                    if (Files.exists(p)) {
                        INLINE_LOGO_BYTES = Files.readAllBytes(p);
                        return INLINE_LOGO_BYTES.length == 0 ? null : INLINE_LOGO_BYTES;
                    }
                } catch (Exception ignored) {
                    // keep trying
                }
            }

            INLINE_LOGO_BYTES = new byte[0];
            return null;
        }
    }

    private String resolveLogoUrlForEmail() {
        // Prefer externally-hosted logo if configured; otherwise use CID inline logo.
        if (!isBlank(logoUrl)) return logoUrl.trim();
        return INLINE_LOGO_SRC;
    }

    private void sendHtmlEmail(String to, String subject, String html) {
        if (to == null || to.isBlank()) {
            logger.warn("Recruitment email skipped: empty recipient");
            return;
        }
        if (fromEmail == null || fromEmail.isBlank()) {
            logger.error("Recruitment email skipped: fromEmail is not configured");
            return;
        }
        try {
            logger.info("Attempting to send recruitment email: to={}, from={}, subject={}, host={}", 
                    to, fromEmail, subject, mailSender instanceof org.springframework.mail.javamail.JavaMailSenderImpl 
                            ? ((org.springframework.mail.javamail.JavaMailSenderImpl) mailSender).getHost() 
                            : "unknown");
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(new InternetAddress(fromEmail, "Thynk Technology"));
            helper.setTo(to.trim());
            helper.setSubject(subject);
            helper.setText(html, true);

            // Inline logo to avoid huge HTML (base64) and improve Gmail/Outlook rendering.
            // If logoUrl is configured, templates will reference the URL and we skip CID.
            if (html != null && html.contains(INLINE_LOGO_SRC) && isBlank(logoUrl)) {
                byte[] bytes = getInlineLogoBytesOrNull();
                if (bytes != null) {
                    helper.addInline(INLINE_LOGO_CID, new ByteArrayResource(bytes), "image/png");
                }
            }
            mailSender.send(message);
            logger.info("Recruitment email sent successfully: to={}, subject={}", to, subject);
        } catch (MessagingException e) {
            logger.error("Failed to send recruitment email: to={}, from={}, subject={}, error={}, cause={}", 
                    to, fromEmail, subject, e.getMessage(), e.getCause() != null ? e.getCause().getMessage() : "none", e);
        } catch (Exception e) {
            logger.error("Unexpected error sending recruitment email: to={}, from={}, subject={}, error={}", 
                    to, fromEmail, subject, e.getMessage(), e);
        }
    }

    /**
     * Same as sendHtmlEmail but rethrows on failure. Used by forgot-password flow so API can return 400.
     */
    private void sendHtmlEmailThrowing(String to, String subject, String html) throws MessagingException {
        if (to == null || to.isBlank()) {
            throw new MessagingException("Recruitment email skipped: empty recipient");
        }
        if (fromEmail == null || fromEmail.isBlank()) {
            throw new MessagingException("Recruitment email skipped: fromEmail is not configured");
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(new InternetAddress(fromEmail, "Thynk Technology"));
            helper.setTo(to.trim());
            helper.setSubject(subject);
            helper.setText(html, true);
            if (html != null && html.contains(INLINE_LOGO_SRC) && isBlank(logoUrl)) {
                byte[] bytes = getInlineLogoBytesOrNull();
                if (bytes != null) {
                    helper.addInline(INLINE_LOGO_CID, new ByteArrayResource(bytes), "image/png");
                }
            }
            mailSender.send(message);
            logger.info("Recruitment email sent successfully: to={}, subject={}", to, subject);
        } catch (java.io.UnsupportedEncodingException e) {
            throw new MessagingException("Failed to encode email: " + e.getMessage(), e);
        }
    }

    /**
     * Forgot-password OTP email. Throws on failure so callers can return user-facing error.
     */
    public void sendForgotPasswordOtp(String toEmail, String otp, int validityMinutes) throws MessagingException {
        String html = emailTemplateService.generateForgotPasswordOtpEmail(otp, validityMinutes, resolveLogoUrlForEmail());
        if (html == null || html.isBlank()) {
            throw new MessagingException("Generated HTML is null or empty for forgot-password OTP email");
        }
        sendHtmlEmailThrowing(toEmail, "Password Reset – Verification Code | Recruitment Desk", html);
    }

    /**
     * Candidate signup verification – account creation confirmation.
     */
    /**
     * Candidate signup verification – account creation confirmation.
     * Checks profile completion to determine redirect URL.
     */
    @Async("emailTaskExecutor")
    public void sendAccountCreationVerification(String toEmail, String candidateName, boolean isProfileCompleted) {
        try {
            String baseUrl = portalUrl != null && !portalUrl.isBlank() ? portalUrl : "https://recruitment.worksphere.ltd";
            // Ensure no trailing slash
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }
            
            String targetUrl = isProfileCompleted ? baseUrl + "/dashboard" : baseUrl + "/complete-profile";
            
            logger.info("Sending account creation email: to={}, candidateName={}, targetUrl={}, logoUrl={}", 
                    toEmail, candidateName, targetUrl, logoUrl != null && !logoUrl.isBlank() ? "set" : "not set");
            String html = emailTemplateService.generateAccountCreationEmail(candidateName, targetUrl, resolveLogoUrlForEmail());
            if (html == null || html.isBlank()) {
                logger.error("Generated HTML is null or empty for account creation email: to={}", toEmail);
                return;
            }
            sendHtmlEmail(toEmail, "Welcome to Thynk Technology – Your Account is Ready", html);
        } catch (Exception e) {
            logger.error("Failed to send account creation verification email: to={}, error={}", toEmail, e.getMessage(), e);
        }
    }

    /**
     * Send account verification email
     */
    /**
     * Send account verification email
     */
    @Async("emailTaskExecutor")
    public void sendAccountVerificationEmail(String toEmail, String candidateName, String token) {
        try {
            String baseUrl = portalUrl != null && !portalUrl.isBlank() ? portalUrl : "https://recruitment.worksphere.ltd";
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }
            // Use the requested link format
            // https://worksphere.ltd/verify-email?token=<secure_token>
            
            String verificationLink = baseUrl + "/verify-email?token=" + token;

            logger.info("Sending verification email: to={}, link={}", toEmail, verificationLink);
            String html = emailTemplateService.generateVerificationEmail(candidateName, verificationLink, resolveLogoUrlForEmail());
            sendHtmlEmail(toEmail, "Verify Your Email Address – WorkSphere India Careers", html);
        } catch (Exception e) {
            logger.error("Failed to send verification email: to={}, error={}", toEmail, e.getMessage(), e);
        }
    }

    /**
     * Send Signup OTP email
     */
    public void sendSignupOtp(String toEmail, String candidateName, String otp) {
        try {
             String html = emailTemplateService.generateSignupOtpEmail(candidateName, otp, 10, resolveLogoUrlForEmail());
             if (html != null && !html.isBlank()) {
                sendHtmlEmailThrowing(toEmail, "Your Email Verification Code – WorkSphere India", html);
             }
        } catch (Exception e) {
             logger.error("Failed to send signup OTP email: to={}, error={}", toEmail, e.getMessage(), e);
             // We want to bubble this up if possible, but async methods can't easily. 
             // However, caller might want to know.
             // For now, we log error. The user requirement says "DO NOT create a user record... Send OTP".
             // If sending fails, we probably shouldn't show success.
             // But existing methods are largely async.
             // I will make this synchronous (remove @Async) inside CandidateService or here.
             // The prompt implies strict flow: Signup -> Send OTP.
             // I'll re-throw runtime exception to stop flow if it fails?
             throw new RuntimeException("Failed to send OTP email: " + e.getMessage());
        }
    }

    /**
     * Technical interview scheduled – notify candidate.
     */
    @Async("emailTaskExecutor")
    public void sendTechnicalInterviewScheduled(
            String toEmail, String candidateName, String jobTitle,
            LocalDate interviewDate, LocalTime interviewTime,
            String interviewerName, String interviewRound) {
        try {
            String html = emailTemplateService.generateTechnicalInterviewScheduledEmail(
                    candidateName, jobTitle, interviewDate, interviewTime,
                    interviewerName, interviewRound, resolveLogoUrlForEmail());
            sendHtmlEmail(toEmail, "Interview Scheduled – " + (jobTitle != null ? jobTitle : "Position"), html);
        } catch (Exception e) {
            logger.error("Failed to send technical interview scheduled email: to={}, jobTitle={}", toEmail, jobTitle, e);
        }
    }

    /**
     * HR interview scheduled – notify candidate.
     */
    @Async("emailTaskExecutor")
    public void sendHrInterviewScheduled(
            String toEmail, String candidateName, String jobTitle,
            LocalDate interviewDate, LocalTime interviewTime,
            String interviewerName, String interviewRound) {
        try {
            String html = emailTemplateService.generateHrInterviewScheduledEmail(
                    candidateName, jobTitle, interviewDate, interviewTime,
                    interviewerName, interviewRound, resolveLogoUrlForEmail());
            sendHtmlEmail(toEmail, "HR Interview Scheduled – " + (jobTitle != null ? jobTitle : "Position"), html);
        } catch (Exception e) {
            logger.error("Failed to send HR interview scheduled email: to={}, jobTitle={}", toEmail, jobTitle, e);
        }
    }

    /**
     * Interview rescheduled – notify candidate.
     */
    @Async("emailTaskExecutor")
    public void sendInterviewRescheduled(
            String toEmail, String candidateName, String jobTitle,
            LocalDate oldDate, LocalTime oldTime, LocalDate newDate, LocalTime newTime,
            String interviewerName, String interviewRound) {
        try {
            String html = emailTemplateService.generateInterviewRescheduledEmail(
                    candidateName, jobTitle, oldDate, oldTime, newDate, newTime,
                    interviewerName, interviewRound, resolveLogoUrlForEmail());
            sendHtmlEmail(toEmail, "Interview Rescheduled – " + (jobTitle != null ? jobTitle : "Position"), html);
        } catch (Exception e) {
            logger.error("Failed to send interview rescheduled email: to={}, jobTitle={}", toEmail, jobTitle, e);
        }
    }

    /**
     * Interviewer assignment – notify interviewer (general notification template).
     */
    @Async("emailTaskExecutor")
    public void sendInterviewerAssignment(
            String toEmail, String interviewerName, String candidateName, String jobTitle, String actionUrl) {
        try {
            String url = actionUrl != null && !actionUrl.isBlank() ? actionUrl : portalUrl;
            String html = emailTemplateService.generateGeneralNotificationEmail(
                    interviewerName,
                    "New Interview Assignment",
                    "You have been assigned to interview " + (candidateName != null ? candidateName : "a candidate")
                            + " for the position of " + (jobTitle != null ? jobTitle : "a role") + ".",
                    jobTitle,
                    "Assigned",
                    "Please review the candidate profile and schedule the interview at your earliest convenience.",
                    url,
                    "View Assignment",
                    "Recruitment Team",
                    resolveLogoUrlForEmail());
            sendHtmlEmail(toEmail, "Interview Assignment – " + (jobTitle != null ? jobTitle : "Position"), html);
        } catch (Exception e) {
            logger.error("Failed to send interviewer assignment email: to={}, jobTitle={}", toEmail, jobTitle, e);
        }
    }

    /**
     * Offer letter generated/sent – notify candidate with PDF attachment.
     */
    @Async("emailTaskExecutor")
    public void sendOfferLetter(
            String toEmail, String candidateName, String jobTitle, String department,
            LocalDate offerDate, LocalDate joiningDate, String employeeId,
            String offerLetterUrl, String portalUrlOverride, String recruiterName,
            com.dashboard.app.recruitment.model.OfferLetter offerLetter) {
        try {
            String url = portalUrlOverride != null && !portalUrlOverride.isBlank() ? portalUrlOverride : portalUrl;
            
            // Fix: Ensure offer letter URL is not null/empty
            if (offerLetterUrl == null || offerLetterUrl.isBlank()) {
                offerLetterUrl = url + (url.endsWith("/") ? "" : "/") + "my-offers";
            }

            String html = emailTemplateService.generateOfferLetterEmail(
                    candidateName, jobTitle, department,
                    offerDate, joiningDate, employeeId,
                    offerLetterUrl, url, resolveLogoUrlForEmail());
            
            // Send email with PDF attachment
            if (toEmail == null || toEmail.isBlank()) {
                logger.warn("Recruitment email skipped: empty recipient");
                return;
            }
            if (fromEmail == null || fromEmail.isBlank()) {
                logger.error("Recruitment email skipped: fromEmail is not configured");
                return;
            }
            
            try {
                logger.info("Attempting to send offer letter email with attachment: to={}, from={}, subject={}", 
                        toEmail, fromEmail, "Offer Letter – " + (jobTitle != null ? jobTitle : "Position"));
                
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(new InternetAddress(fromEmail, "Thynk Technology"));
                helper.setTo(toEmail.trim());
                helper.setSubject("Offer Letter – " + (jobTitle != null ? jobTitle : "Position"));
                helper.setText(html, true);

                // Inline logo (same reasoning as sendHtmlEmail)
                if (html != null && html.contains(INLINE_LOGO_SRC) && isBlank(logoUrl)) {
                    byte[] bytes = getInlineLogoBytesOrNull();
                    if (bytes != null) {
                        helper.addInline(INLINE_LOGO_CID, new ByteArrayResource(bytes), "image/png");
                    }
                }
                
                // Generate and attach PDF if offer letter is provided
                if (offerLetter != null) {
                    try {
                        String offerHtml = offerTemplateService.generateOfferHtml(offerLetter);
                        byte[] pdfBytes = offerPdfService.generatePdfFromHtml(offerHtml);
                        String fileName = "Offer_Letter_" + (employeeId != null ? employeeId : offerLetter.getId()) + ".pdf";
                        helper.addAttachment(fileName, new ByteArrayResource(pdfBytes), "application/pdf");
                        logger.info("PDF attachment added to offer letter email: fileName={}, size={} bytes", 
                                fileName, pdfBytes.length);
                    } catch (Exception pdfError) {
                        logger.error("Failed to generate PDF attachment for offer letter email, continuing without attachment: {}", 
                                pdfError.getMessage(), pdfError);
                        // Continue sending email without attachment if PDF generation fails
                    }
                }
                
                mailSender.send(message);
                logger.info("Offer letter email sent successfully with attachment: to={}, subject={}", 
                        toEmail, "Offer Letter – " + (jobTitle != null ? jobTitle : "Position"));
            } catch (MessagingException e) {
                logger.error("Failed to send offer letter email: to={}, from={}, subject={}, error={}, cause={}", 
                        toEmail, fromEmail, "Offer Letter – " + (jobTitle != null ? jobTitle : "Position"), 
                        e.getMessage(), e.getCause() != null ? e.getCause().getMessage() : "none", e);
            } catch (Exception e) {
                logger.error("Unexpected error sending offer letter email: to={}, from={}, subject={}, error={}", 
                        toEmail, fromEmail, "Offer Letter – " + (jobTitle != null ? jobTitle : "Position"), 
                        e.getMessage(), e);
            }
        } catch (Exception e) {
            logger.error("Failed to send offer letter email: to={}, jobTitle={}", toEmail, jobTitle, e);
        }
    }

    /**
     * Status notification – application status updates (e.g. shortlisted, rejected).
     */
    @Async("emailTaskExecutor")
    public void sendStatusNotification(
            String toEmail, String candidateName, String subject, String message,
            String jobTitle, String applicationStatus, String additionalInfo,
            String actionUrl, String actionButtonText) {
        try {
            String html = emailTemplateService.generateGeneralNotificationEmail(
                    candidateName, subject, message, jobTitle, applicationStatus,
                    additionalInfo, actionUrl != null ? actionUrl : portalUrl,
                    actionButtonText != null ? actionButtonText : "View Details",
                    "Recruitment Team",
                    resolveLogoUrlForEmail());
            sendHtmlEmail(toEmail, subject != null && !subject.isBlank() ? subject : "Application Update", html);
        } catch (Exception e) {
            logger.error("Failed to send status notification email: to={}, subject={}", toEmail, subject, e);
        }
    }

    /**
     * Interview feedback update – notify candidate (e.g. after technical/HR result).
     */
    @Async("emailTaskExecutor")
    public void sendInterviewFeedback(
            String toEmail, String candidateName, String jobTitle, LocalDate interviewDate,
            String interviewerName, String interviewRound, String result,
            String feedbackRemarks, String nextSteps) {
        try {
            String html = emailTemplateService.generateInterviewFeedbackEmail(
                    candidateName, jobTitle, interviewDate,
                    interviewerName, interviewRound, result,
                    feedbackRemarks, nextSteps, portalUrl, resolveLogoUrlForEmail());
            sendHtmlEmail(toEmail, "Interview Feedback – " + (jobTitle != null ? jobTitle : "Position"), html);
        } catch (Exception e) {
            logger.error("Failed to send interview feedback email: to={}, jobTitle={}", toEmail, jobTitle, e);
        }
    }

    /**
     * Document upload required – notify candidate when shortlisted.
     */
    @Async("emailTaskExecutor")
    public void sendDocumentUploadRequired(
            String toEmail, String candidateName, String jobTitle) {
        try {
            // documentsUrl should point to the My Offers / Documents section
            String documentsUrl = portalUrl + "/my-offers"; 
            String html = emailTemplateService.generateDocumentUploadRequiredEmail(
                    candidateName, jobTitle, documentsUrl, resolveLogoUrlForEmail());
            sendHtmlEmail(toEmail, "Action Required: Mandatory Document Upload", html);
        } catch (Exception e) {
            logger.error("Failed to send document upload required email: to={}, jobTitle={}", toEmail, jobTitle, e);
        }
    }

    /**
     * Rejection email – notify candidate.
     */
    @Async("emailTaskExecutor")
    public void sendRejectionEmail(
            String toEmail, String candidateName, String jobTitle) {
        try {
            String html = emailTemplateService.generateRejectionEmail(
                    candidateName, jobTitle, resolveLogoUrlForEmail());
            sendHtmlEmail(toEmail, "Application Update – " + (jobTitle != null ? jobTitle : "Position"), html);
        } catch (Exception e) {
            logger.error("Failed to send rejection email: to={}, jobTitle={}", toEmail, jobTitle, e);
        }
    }
}
