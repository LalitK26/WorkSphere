package com.dashboard.app.recruitment.config;

import com.dashboard.app.model.enums.UserStatus;
import com.dashboard.app.recruitment.model.RecruitmentRole;
import com.dashboard.app.recruitment.model.RecruitmentUser;
import com.dashboard.app.recruitment.model.enums.RecruitmentRoleType;
import com.dashboard.app.recruitment.repository.RecruitmentRoleRepository;
import com.dashboard.app.recruitment.repository.RecruitmentUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Initializes recruitment-specific data including the recruitment admin user.
 * Recruitment admin credentials:
 * Email: admin@recruitment.com
 * Password: admin123
 */
@Component
public class RecruitmentDataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(RecruitmentDataInitializer.class);

    @Autowired
    private RecruitmentRoleRepository recruitmentRoleRepository;

    @Autowired
    private RecruitmentUserRepository recruitmentUserRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private boolean initialized = false;

    @Override
    public void run(String... args) {
        // Initialization will happen via ContextRefreshedEvent
    }

    @EventListener
    public void onApplicationEvent(ContextRefreshedEvent event) {
        if (!initialized) {
            try {
                logger.info("Initializing recruitment data...");
                initializeRecruitmentRoles();
                initializeRecruitmentAdmin();
                initialized = true;
                logger.info("✅ Successfully initialized recruitment data");
            } catch (Exception e) {
                // Check if error is about table not existing
                String errorMsg = e.getMessage();
                Throwable cause = e.getCause();
                while (cause != null) {
                    errorMsg = cause.getMessage();
                    cause = cause.getCause();
                }
                if (errorMsg != null && (errorMsg.contains("doesn't exist") ||
                        (errorMsg.contains("Table") && errorMsg.contains("not found")) ||
                        errorMsg.contains("Unknown table"))) {
                    logger.warn(
                            "⚠️  Recruitment tables do not exist yet. Will be initialized on next startup after schema.sql creates tables. Error: {}",
                            errorMsg);
                    // Don't set initialized = true, so it will retry on next ContextRefreshedEvent
                } else {
                    logger.error("❌ Error initializing recruitment data", e);
                }
                // Don't throw exception to prevent app shutdown
                // Tables will be created by schema.sql, and initialization can happen on next
                // startup
            }
        }
    }

    @Transactional
    private void initializeRecruitmentRoles() {
        // Create recruitment roles if they don't exist
        createRoleIfNotExists("Recruitment Admin", RecruitmentRoleType.RECRUITMENT_ADMIN,
                "Recruitment system administrator");
        createRoleIfNotExists("Recruiter", RecruitmentRoleType.RECRUITER, "Recruiter role for handling candidates");
        createRoleIfNotExists("Technical Interviewer", RecruitmentRoleType.TECHNICAL_INTERVIEWER,
                "Technical interviewer role");
        createRoleIfNotExists("Candidate", RecruitmentRoleType.CANDIDATE, "Candidate role for applicants");
    }

    private void createRoleIfNotExists(String name, RecruitmentRoleType type, String description) {
        if (!recruitmentRoleRepository.existsByName(name)) {
            RecruitmentRole role = new RecruitmentRole();
            role.setName(name);
            role.setType(type);
            role.setDescription(description);
            recruitmentRoleRepository.save(role);
            logger.info("Created recruitment role: " + name);
        }
    }

    @Transactional
    private void initializeRecruitmentAdmin() {
        String adminEmail = "admin@recruitment.com";
        String adminPassword = "admin123";

        try {
            // Check if table exists by trying to query it
            recruitmentUserRepository.findAll().size();
        } catch (Exception e) {
            // Check if error is about table not existing
            String errorMsg = e.getMessage();
            Throwable cause = e.getCause();
            while (cause != null) {
                errorMsg = cause.getMessage();
                cause = cause.getCause();
            }
            if (errorMsg != null && (errorMsg.contains("doesn't exist") ||
                    (errorMsg.contains("Table") && errorMsg.contains("not found")) ||
                    errorMsg.contains("Unknown table"))) {
                logger.warn("⚠️  Table recruitment_users does not exist yet. Will be initialized on next startup.");
                throw new RuntimeException("Table not found - will retry on next startup");
            }
            // If it's a different error, rethrow
            throw e;
        }

        if (!recruitmentUserRepository.existsByEmail(adminEmail)) {
            RecruitmentUser admin = new RecruitmentUser();
            admin.setEmail(adminEmail);
            admin.setPassword(passwordEncoder.encode(adminPassword));
            admin.setName("Recruitment Admin");
            admin.setStatus(UserStatus.ACTIVE);

            RecruitmentRole adminRole = recruitmentRoleRepository.findByType(RecruitmentRoleType.RECRUITMENT_ADMIN)
                    .stream()
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException(
                            "Recruitment Admin role not found. Please check role initialization."));

            admin.setRole(adminRole);
            recruitmentUserRepository.save(admin);
            logger.info("Created recruitment admin user with email: " + adminEmail);
        }
    }
}
