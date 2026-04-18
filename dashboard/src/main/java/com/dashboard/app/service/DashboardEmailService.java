package com.dashboard.app.service;

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
import java.util.List;

/**
 * Dashboard email delivery service for Employee Dashboard notifications.
 * Uses shared JavaMailSender for sending HTML emails with embedded logos.
 * Failures are logged; operations never throw to keep dashboard flows unaffected.
 */
@Service
public class DashboardEmailService {

    private static final Logger logger = LoggerFactory.getLogger(DashboardEmailService.class);
    private static final String INLINE_LOGO_CID = "thynk-logo";
    private static final String INLINE_LOGO_SRC = "cid:" + INLINE_LOGO_CID;
    private static volatile byte[] INLINE_LOGO_BYTES;

    @Autowired
    private JavaMailSender mailSender;

    @Autowired
    private DashboardEmailTemplateService templateService;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${app.email.logo-url:}")
    private String logoUrl;

    @Value("${app.dashboard.portal-url:https://dashboard.worksphere.ltd}")
    private String portalUrl;

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private byte[] getInlineLogoBytesOrNull() {
        byte[] cached = INLINE_LOGO_BYTES;
        if (cached != null) return cached.length == 0 ? null : cached;

        synchronized (DashboardEmailService.class) {
            if (INLINE_LOGO_BYTES != null) return INLINE_LOGO_BYTES.length == 0 ? null : INLINE_LOGO_BYTES;

            // Try classpath first - check multiple locations
            String[] classpathLocations = {
                "static/images/white_logo.png",
                "email-assets/white_logo.png",
                "images/white_logo.png"
            };
            for (String location : classpathLocations) {
                try {
                    ClassPathResource cp = new ClassPathResource(location);
                    if (cp.exists()) {
                        INLINE_LOGO_BYTES = cp.getInputStream().readAllBytes();
                        logger.info("Loaded logo from classpath: {}", location);
                        return INLINE_LOGO_BYTES.length == 0 ? null : INLINE_LOGO_BYTES;
                    }
                } catch (Exception ignored) {
                    // try next location
                }
            }

            // Fallback: monorepo filesystem path
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
        if (!isBlank(logoUrl)) return logoUrl.trim();
        return INLINE_LOGO_SRC;
    }

    private void sendHtmlEmail(String to, String subject, String html) {
        if (to == null || to.isBlank()) {
            logger.warn("Dashboard email skipped: empty recipient for subject={}", subject);
            return;
        }
        if (fromEmail == null || fromEmail.isBlank()) {
            logger.error("Dashboard email skipped: fromEmail is not configured (spring.mail.username). Subject={}, To={}", subject, to);
            return;
        }
        if (html == null || html.isBlank()) {
            logger.error("Dashboard email skipped: empty HTML content for subject={}, to={}", subject, to);
            return;
        }
        try {
            logger.info("Attempting to send dashboard email: to={}, subject={}, fromEmail={}", to, subject, fromEmail);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(new InternetAddress(fromEmail, "Thynk Technology"));
            helper.setTo(to.trim());
            helper.setSubject(subject);
            helper.setText(html, true);

            // Inline logo to avoid huge HTML (base64) and improve Gmail/Outlook rendering
            if (html.contains(INLINE_LOGO_SRC) && isBlank(logoUrl)) {
                byte[] bytes = getInlineLogoBytesOrNull();
                if (bytes != null) {
                    helper.addInline(INLINE_LOGO_CID, new ByteArrayResource(bytes), "image/png");
                    logger.debug("Added inline logo to email: to={}", to);
                } else {
                    logger.warn("Logo bytes not found for inline attachment, email will be sent without logo: to={}", to);
                }
            }
            mailSender.send(message);
            logger.info("Dashboard email sent successfully: to={}, subject={}", to, subject);
        } catch (MessagingException e) {
            logger.error("MessagingException sending dashboard email: to={}, subject={}, fromEmail={}, error={}", 
                to, subject, fromEmail, e.getMessage(), e);
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        } catch (Exception e) {
            logger.error("Unexpected error sending dashboard email: to={}, subject={}, fromEmail={}, error={}", 
                to, subject, fromEmail, e.getMessage(), e);
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        }
    }

    // ==================== LEAVE NOTIFICATIONS ====================

    /**
     * Send leave approval notification to employee
     */
    @Async("emailTaskExecutor")
    public void sendLeaveApprovedNotification(String toEmail, String employeeName, String leaveType,
                                               LocalDate startDate, LocalDate endDate, String approverName, Long leaveId) {
        try {
            String html = templateService.generateLeaveApprovedEmail(employeeName, leaveType,
                    startDate, endDate, approverName, portalUrl, resolveLogoUrlForEmail(), leaveId);
            sendHtmlEmail(toEmail, "Leave Request Approved – " + leaveType, html);
        } catch (Exception e) {
            logger.error("Failed to send leave approved email: to={}, error={}", toEmail, e.getMessage(), e);
        }
    }

    /**
     * Send leave rejection notification to employee
     */
    @Async("emailTaskExecutor")
    public void sendLeaveRejectedNotification(String toEmail, String employeeName, String leaveType,
                                               LocalDate startDate, LocalDate endDate, String rejectorName, String reason, Long leaveId) {
        try {
            String html = templateService.generateLeaveRejectedEmail(employeeName, leaveType,
                    startDate, endDate, rejectorName, reason, portalUrl, resolveLogoUrlForEmail(), leaveId);
            sendHtmlEmail(toEmail, "Leave Request Declined – " + leaveType, html);
        } catch (Exception e) {
            logger.error("Failed to send leave rejected email: to={}, error={}", toEmail, e.getMessage(), e);
        }
    }

    // ==================== TICKET NOTIFICATIONS ====================

    /**
     * Send ticket created notification to admin
     */
    @Async("emailTaskExecutor")
    public void sendTicketCreatedNotificationHtml(String toEmail, String ticketNumber, String subject,
                                                   String requesterName, String requesterEmail, String priority, Long ticketId) {
        logger.info("Preparing ticket created notification: to={}, ticket={}, subject={}", toEmail, ticketNumber, subject);
        try {
            String html = templateService.generateTicketCreatedEmail(ticketNumber, subject,
                    requesterName, requesterEmail, priority, portalUrl, resolveLogoUrlForEmail(), ticketId);
            sendHtmlEmail(toEmail, "New Ticket Created: " + ticketNumber, html);
            logger.info("Ticket created notification sent successfully: to={}, ticket={}", toEmail, ticketNumber);
        } catch (Exception e) {
            logger.error("Failed to send ticket created email: to={}, ticket={}, error={}", toEmail, ticketNumber, e.getMessage(), e);
            throw new RuntimeException("Failed to send ticket created email: " + e.getMessage(), e);
        }
    }

    /**
     * Send ticket assigned notification to employee
     */
    @Async("emailTaskExecutor")
    public void sendTicketAssignedNotificationHtml(String toEmail, String assigneeName, String ticketNumber,
                                                    String subject, String priority, String requesterName, Long ticketId) {
        logger.info("Preparing ticket assigned notification: to={}, ticket={}, assignee={}", toEmail, ticketNumber, assigneeName);
        try {
            String html = templateService.generateTicketAssignedEmail(assigneeName, ticketNumber,
                    subject, priority, requesterName, portalUrl, resolveLogoUrlForEmail(), ticketId);
            sendHtmlEmail(toEmail, "Ticket Assigned to You: " + ticketNumber, html);
            logger.info("Ticket assigned notification sent successfully: to={}, ticket={}", toEmail, ticketNumber);
        } catch (Exception e) {
            logger.error("Failed to send ticket assigned email: to={}, ticket={}, error={}", toEmail, ticketNumber, e.getMessage(), e);
            throw new RuntimeException("Failed to send ticket assigned email: " + e.getMessage(), e);
        }
    }

    /**
     * Send ticket status update notification
     */
    @Async("emailTaskExecutor")
    public void sendTicketStatusUpdateNotification(String toEmail, String recipientName, String ticketNumber,
                                                    String subject, String oldStatus, String newStatus, String updatedBy, Long ticketId) {
        logger.info("Preparing ticket status update notification: to={}, ticket={}, oldStatus={}, newStatus={}", 
            toEmail, ticketNumber, oldStatus, newStatus);
        try {
            String html = templateService.generateTicketStatusUpdateEmail(recipientName, ticketNumber,
                    subject, oldStatus, newStatus, updatedBy, portalUrl, resolveLogoUrlForEmail(), ticketId);
            sendHtmlEmail(toEmail, "Ticket Status Updated: " + ticketNumber, html);
            logger.info("Ticket status update notification sent successfully: to={}, ticket={}", toEmail, ticketNumber);
        } catch (Exception e) {
            logger.error("Failed to send ticket status update email: to={}, ticket={}, error={}", toEmail, ticketNumber, e.getMessage(), e);
            throw new RuntimeException("Failed to send ticket status update email: " + e.getMessage(), e);
        }
    }

    // ==================== EVENT NOTIFICATIONS ====================

    /**
     * Send event created notification to assigned employees
     */
    @Async("emailTaskExecutor")
    public void sendEventCreatedNotification(String toEmail, String employeeName, String eventName,
                                              LocalDate eventDate, LocalTime eventTime, String location,
                                              String description, String createdByName, Long eventId) {
        try {
            String html = templateService.generateEventCreatedEmail(employeeName, eventName,
                    eventDate, eventTime, location, description, createdByName, portalUrl, resolveLogoUrlForEmail(), eventId);
            sendHtmlEmail(toEmail, "New Event: " + eventName, html);
        } catch (Exception e) {
            logger.error("Failed to send event created email: to={}, event={}, error={}", toEmail, eventName, e.getMessage(), e);
        }
    }

    /**
     * Send event assigned notification to employee
     */
    @Async("emailTaskExecutor")
    public void sendEventAssignedNotification(String toEmail, String employeeName, String eventName,
                                               LocalDate eventDate, LocalTime eventTime, String location, Long eventId) {
        try {
            String html = templateService.generateEventAssignedEmail(employeeName, eventName,
                    eventDate, eventTime, location, portalUrl, resolveLogoUrlForEmail(), eventId);
            sendHtmlEmail(toEmail, "You've Been Added to Event: " + eventName, html);
        } catch (Exception e) {
            logger.error("Failed to send event assigned email: to={}, event={}, error={}", toEmail, eventName, e.getMessage(), e);
        }
    }

    // ==================== PROJECT NOTIFICATIONS ====================

    /**
     * Send project assigned notification to employee
     */
    @Async("emailTaskExecutor")
    public void sendProjectAssignedNotification(String toEmail, String employeeName, String projectName,
                                                 String projectCode, LocalDate startDate, LocalDate deadline,
                                                 String projectAdminName, Long projectId) {
        try {
            String html = templateService.generateProjectAssignedEmail(employeeName, projectName,
                    projectCode, startDate, deadline, projectAdminName, portalUrl, resolveLogoUrlForEmail(), projectId);
            sendHtmlEmail(toEmail, "Project Assignment: " + projectName, html);
        } catch (Exception e) {
            logger.error("Failed to send project assigned email: to={}, project={}, error={}", toEmail, projectName, e.getMessage(), e);
        }
    }

    // ==================== TASK NOTIFICATIONS ====================

    /**
     * Send task assigned notification to employee
     */
    @Async("emailTaskExecutor")
    public void sendTaskAssignedNotification(String toEmail, String employeeName, String taskTitle,
                                              String taskCode, String projectName, String priority,
                                              LocalDate dueDate, String assignedByName, Long taskId) {
        try {
            String html = templateService.generateTaskAssignedEmail(employeeName, taskTitle,
                    taskCode, projectName, priority, dueDate, assignedByName, portalUrl, resolveLogoUrlForEmail(), taskId);
            sendHtmlEmail(toEmail, "New Task Assigned: " + taskTitle, html);
        } catch (Exception e) {
            logger.error("Failed to send task assigned email: to={}, task={}, error={}", toEmail, taskTitle, e.getMessage(), e);
        }
    }

    // ==================== SHIFT ROSTER NOTIFICATIONS ====================

    /**
     * Send shift assigned notification to employee
     */
    @Async("emailTaskExecutor")
    public void sendShiftAssignedNotification(String toEmail, String employeeName, String shiftName,
                                               LocalTime startTime, LocalTime endTime, LocalDate shiftDate, String remark) {
        logger.info("Preparing shift assigned notification: to={}, employee={}, shift={}, date={}", 
            toEmail, employeeName, shiftName, shiftDate);
        try {
            String html = templateService.generateShiftAssignedEmail(employeeName, shiftName,
                    startTime, endTime, shiftDate, remark, portalUrl, resolveLogoUrlForEmail());
            sendHtmlEmail(toEmail, "Shift Assignment: " + shiftDate, html);
            logger.info("Shift assigned notification sent successfully: to={}, date={}", toEmail, shiftDate);
        } catch (Exception e) {
            logger.error("Failed to send shift assigned email: to={}, date={}, shift={}, error={}", 
                toEmail, shiftDate, shiftName, e.getMessage(), e);
            throw new RuntimeException("Failed to send shift assigned email: " + e.getMessage(), e);
        }
    }

    /**
     * Send shift updated notification to employee
     */
    @Async("emailTaskExecutor")
    public void sendShiftUpdatedNotification(String toEmail, String employeeName, String oldShiftName,
                                              String newShiftName, LocalTime newStartTime, LocalTime newEndTime,
                                              LocalDate shiftDate, String remark) {
        logger.info("Preparing shift updated notification: to={}, employee={}, oldShift={}, newShift={}, date={}", 
            toEmail, employeeName, oldShiftName, newShiftName, shiftDate);
        try {
            String html = templateService.generateShiftUpdatedEmail(employeeName, oldShiftName, newShiftName,
                    newStartTime, newEndTime, shiftDate, remark, portalUrl, resolveLogoUrlForEmail());
            sendHtmlEmail(toEmail, "Shift Updated: " + shiftDate, html);
            logger.info("Shift updated notification sent successfully: to={}, date={}", toEmail, shiftDate);
        } catch (Exception e) {
            logger.error("Failed to send shift updated email: to={}, date={}, error={}", toEmail, shiftDate, e.getMessage(), e);
            throw new RuntimeException("Failed to send shift updated email: " + e.getMessage(), e);
        }
    }

    // ==================== HOLIDAY NOTIFICATIONS ====================

    /**
     * Send holiday announcement notification to employees
     */
    @Async("emailTaskExecutor")
    public void sendHolidayAnnouncementNotification(String toEmail, String employeeName, String occasion,
                                                     LocalDate holidayDate, boolean isCommon, Long holidayId) {
        try {
            String html = templateService.generateHolidayAnnouncementEmail(employeeName, occasion,
                    holidayDate, isCommon, portalUrl, resolveLogoUrlForEmail(), holidayId);
            sendHtmlEmail(toEmail, "Holiday Announcement: " + occasion, html);
        } catch (Exception e) {
            logger.error("Failed to send holiday announcement email: to={}, occasion={}, error={}", toEmail, occasion, e.getMessage(), e);
        }
    }

    /**
     * Send bulk holiday announcement to multiple employees
     */
    @Async("emailTaskExecutor")
    public void sendBulkHolidayAnnouncement(List<String> toEmails, List<String> employeeNames, String occasion,
                                             LocalDate holidayDate, boolean isCommon, Long holidayId) {
        for (int i = 0; i < toEmails.size(); i++) {
            String email = toEmails.get(i);
            String name = i < employeeNames.size() ? employeeNames.get(i) : "Employee";
            sendHolidayAnnouncementNotification(email, name, occasion, holidayDate, isCommon, holidayId);
        }
    }
}
