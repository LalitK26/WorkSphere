package com.dashboard.app.recruitment.controller;

import com.dashboard.app.recruitment.service.RecruitmentEmailService;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.web.bind.annotation.*;

import jakarta.mail.internet.MimeMessage;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

/**
 * Test endpoint for email functionality (development/testing only).
 * Allows testing email sending without creating actual candidate accounts.
 */
@RestController
@RequestMapping("/api/recruitment/test")
@CrossOrigin(origins = "*")
public class EmailTestController {

    private static final Logger logger = LoggerFactory.getLogger(EmailTestController.class);

    @Autowired
    private RecruitmentEmailService recruitmentEmailService;

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Value("${spring.mail.host}")
    private String mailHost;

    @Value("${spring.mail.port}")
    private int mailPort;

    @Value("${app.recruitment.portal-url:http://localhost:3001}")
    private String portalUrl;

    @Value("${spring.mail.password}")
    private String mailPassword;

    /**
     * Test direct SMTP connection (bypasses Spring Boot mail configuration)
     */
    @GetMapping("/email/connection")
    public ResponseEntity<Map<String, Object>> testSmtpConnection() {
        Map<String, Object> response = new HashMap<>();
        try {
            // Validate configuration values are loaded
            if (mailHost == null || mailHost.isBlank()) {
                response.put("success", false);
                response.put("error", "Mail host is not configured");
                response.put("configIssue", true);
                return ResponseEntity.status(500).body(response);
            }
            if (fromEmail == null || fromEmail.isBlank()) {
                response.put("success", false);
                response.put("error", "Mail username is not configured");
                response.put("configIssue", true);
                return ResponseEntity.status(500).body(response);
            }
            if (mailPassword == null || mailPassword.isBlank()) {
                // Allow empty password as per new policy
                logger.info("Mail password is explicitly empty/blank");
            }
            
            logger.info("Testing direct SMTP connection to {}:{} with username: {}", mailHost, mailPort, fromEmail);
            
            Properties props = new Properties();
            props.put("mail.smtp.host", mailHost);
            props.put("mail.smtp.port", String.valueOf(mailPort));
            props.put("mail.smtp.auth", "true");
            
            // Use STARTTLS for port 587, SSL for port 465
            if (mailPort == 587) {
                props.put("mail.smtp.starttls.enable", "true");
                props.put("mail.smtp.starttls.required", "true");
                props.put("mail.smtp.ssl.enable", "false");
            } else if (mailPort == 465) {
                props.put("mail.smtp.ssl.enable", "true");
                props.put("mail.smtp.ssl.trust", "*");
                props.put("mail.smtp.socketFactory.port", String.valueOf(mailPort));
                props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
                props.put("mail.smtp.socketFactory.fallback", "false");
                props.put("mail.smtp.starttls.enable", "false");
            }
            
            props.put("mail.smtp.connectiontimeout", "10000");
            props.put("mail.smtp.timeout", "10000");
            props.put("mail.debug", "true");
            
            Session session = Session.getInstance(props, null);
            session.setDebug(true);
            
            Transport transport = session.getTransport("smtp");
            transport.connect(mailHost, mailPort, fromEmail, mailPassword);
            transport.close();
            
            response.put("success", true);
            response.put("message", "Successfully connected to SMTP server");
            response.put("host", mailHost);
            response.put("port", mailPort);
            response.put("username", fromEmail);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("SMTP connection test failed: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("error", e.getMessage() != null ? e.getMessage() : "Unknown error");
            response.put("errorClass", e.getClass().getName());
            if (e.getCause() != null) {
                response.put("cause", e.getCause().getMessage());
            }
            // Add stack trace for debugging
            java.io.StringWriter sw = new java.io.StringWriter();
            java.io.PrintWriter pw = new java.io.PrintWriter(sw);
            e.printStackTrace(pw);
            response.put("stackTrace", sw.toString());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Test sending a simple email using Spring Boot's JavaMailSender
     */
    @PostMapping("/email/simple")
    public ResponseEntity<Map<String, Object>> testSimpleEmail(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String toEmail = request.get("email");
            if (toEmail == null || toEmail.isBlank()) {
                response.put("success", false);
                response.put("error", "Email is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            logger.info("Testing simple email: to={}, from={}, host={}, port={}", 
                    toEmail, fromEmail, mailHost, mailPort);
            
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Test Email from Thynk Technology");
            helper.setText("This is a test email to verify SMTP configuration.", false);
            
            mailSender.send(message);
            
            response.put("success", true);
            response.put("message", "Simple test email sent successfully");
            response.put("to", toEmail);
            response.put("from", fromEmail);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Simple email test failed", e);
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("errorClass", e.getClass().getName());
            if (e.getCause() != null) {
                response.put("cause", e.getCause().getMessage());
            }
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Get mail configuration (for debugging)
     */
    @GetMapping("/email/config")
    public ResponseEntity<Map<String, Object>> getMailConfig() {
        Map<String, Object> config = new HashMap<>();
        try {
            if (mailSender instanceof JavaMailSenderImpl) {
                JavaMailSenderImpl impl = (JavaMailSenderImpl) mailSender;
                config.put("host", impl.getHost());
                config.put("port", impl.getPort());
                config.put("username", impl.getUsername());
                config.put("password", impl.getPassword() != null ? "***" : "not set");
                config.put("javaMailProperties", impl.getJavaMailProperties());
            }
            config.put("fromEmail", fromEmail);
            config.put("portalUrl", portalUrl);
            config.put("mailHost", mailHost);
            config.put("mailPort", mailPort);
            return ResponseEntity.ok(config);
        } catch (Exception e) {
            logger.error("Failed to get mail config", e);
            config.put("error", e.getMessage());
            return ResponseEntity.status(500).body(config);
        }
    }

    /**
     * Test account creation email
     */
    @PostMapping("/email/account-creation")
    public ResponseEntity<Map<String, Object>> testAccountCreationEmail(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String toEmail = request.get("email");
            String candidateName = request.get("name");
            
            if (toEmail == null || toEmail.isBlank()) {
                response.put("success", false);
                response.put("error", "Email is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            logger.info("Testing account creation email: to={}, name={}, portalUrl={}, fromEmail={}, host={}, port={}", 
                    toEmail, candidateName, portalUrl, fromEmail, mailHost, mailPort);
            
            boolean isCompleted = Boolean.parseBoolean(request.getOrDefault("isCompleted", "false"));
            recruitmentEmailService.sendAccountCreationVerification(
                    toEmail,
                    candidateName != null ? candidateName : "Test Candidate",
                    isCompleted);
            
            response.put("success", true);
            response.put("message", "Test email sent to " + toEmail);
            response.put("from", fromEmail);
            response.put("portalUrl", portalUrl);
            response.put("host", mailHost);
            response.put("port", mailPort);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Test email failed", e);
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("stackTrace", e.getClass().getName() + ": " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
}
