package com.dashboard.app.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    private static final String ADMIN_EMAIL = "workspheredashboard@gmail.com";

    public void sendTicketCreatedNotification(String ticketNumber, String subject, String requesterName, String requesterEmail) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(ADMIN_EMAIL);
            message.setSubject("New Ticket Created: " + ticketNumber);
            message.setText(String.format(
                "A new ticket has been created in the system.\n\n" +
                "Ticket Number: %s\n" +
                "Subject: %s\n" +
                "Requester: %s (%s)\n\n" +
                "Please log in to the dashboard to view and assign this ticket.",
                ticketNumber, subject, requesterName, requesterEmail
            ));
            mailSender.send(message);
        } catch (Exception e) {
            // Log error but don't fail ticket creation
            logger.error("Failed to send email notification for ticket: {}", ticketNumber, e);
        }
    }

    public void sendTicketAssignedNotification(String ticketNumber, String subject, String assignedToEmail, String assignedToName) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(assignedToEmail);
            message.setSubject("Ticket Assigned to You: " + ticketNumber);
            message.setText(String.format(
                "Hello %s,\n\n" +
                "A new ticket has been assigned to you.\n\n" +
                "Ticket Number: %s\n" +
                "Subject: %s\n\n" +
                "Please log in to the dashboard to view and work on this ticket.",
                assignedToName, ticketNumber, subject
            ));
            mailSender.send(message);
        } catch (Exception e) {
            // Log error but don't fail ticket assignment
            logger.error("Failed to send email notification for ticket assignment: {}", ticketNumber, e);
        }
    }
}

