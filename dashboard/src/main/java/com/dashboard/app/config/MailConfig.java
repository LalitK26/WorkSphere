package com.dashboard.app.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

/**
 * Mail configuration for GoDaddy SMTP (smtpout.secureserver.net:465 SSL/TLS).
 * Configures JavaMailSender with proper SSL/TLS settings for secure email delivery.
 * All credentials are loaded from environment variables (SMTP_USERNAME, SMTP_PASSWORD).
 */
@Configuration
public class MailConfig {

    private static final Logger logger = LoggerFactory.getLogger(MailConfig.class);

    @Value("${spring.mail.host}")
    private String host;

    @Value("${spring.mail.port}")
    private int port;

    @Value("${spring.mail.username}")
    private String username;

    @Value("${spring.mail.password}")
    private String password;

    @Bean
    public JavaMailSender javaMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        mailSender.setHost(host);
        mailSender.setPort(port);
        mailSender.setUsername(username);
        mailSender.setPassword(password);

        Properties props = mailSender.getJavaMailProperties();
        
        // Authentication
        props.put("mail.smtp.auth", "true");
        
        // SSL/TLS configuration for port 465 (GoDaddy secure SMTP)
        if (port == 465) {
            // Use SSL directly (not STARTTLS)
            props.put("mail.smtp.ssl.enable", "true");
            props.put("mail.smtp.ssl.trust", "*");
            props.put("mail.smtp.starttls.enable", "false");
            props.put("mail.smtp.starttls.required", "false");
            
            // Socket factory for SSL
            props.put("mail.smtp.socketFactory.port", "465");
            props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
            props.put("mail.smtp.socketFactory.fallback", "false");
            
            logger.info("Configured JavaMailSender for GoDaddy SMTP with SSL on port 465: host={}, username={}", 
                    host, username);
        } else if (port == 587) {
            // Use STARTTLS for port 587
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
            props.put("mail.smtp.ssl.enable", "false");
            
            logger.info("Configured JavaMailSender for SMTP with STARTTLS on port 587: host={}, username={}", 
                    host, username);
        }
        
        // Connection timeouts
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");
        
        // Debug mode (can be disabled in production)
        props.put("mail.debug", "false");

        return mailSender;
    }
}
