package com.dashboard.app;

import com.dashboard.app.config.EnvironmentConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EntityScan(basePackages = {"com.dashboard.app.model", "com.dashboard.app.recruitment.model"})
@EnableJpaRepositories(basePackages = {"com.dashboard.app.repository", "com.dashboard.app.recruitment.repository"})
public class DashboardApplication {

	private static final Logger logger = LoggerFactory.getLogger(DashboardApplication.class);

	public static void main(String[] args) {
		SpringApplication app = new SpringApplication(DashboardApplication.class);
		
		// Register EnvironmentConfig listener to load .env files
		app.addListeners(new EnvironmentConfig());
		
		// Auto-detect profile from environment variable or system property
		// Priority: SPRING_PROFILES_ACTIVE env var > spring.profiles.active system property > default 'dev'
		String activeProfile = System.getenv("SPRING_PROFILES_ACTIVE");
		if (activeProfile == null || activeProfile.isEmpty()) {
			activeProfile = System.getProperty("spring.profiles.active");
		}
		if (activeProfile == null || activeProfile.isEmpty()) {
			activeProfile = "dev"; // Default to development
		}
		
		app.setAdditionalProfiles(activeProfile);
		logger.info("Starting application with profile: {}", activeProfile);
		
		app.run(args);
	}

}
