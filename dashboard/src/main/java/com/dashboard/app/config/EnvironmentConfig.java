package com.dashboard.app.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertiesPropertySource;
import org.springframework.lang.NonNull;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.Properties;

/**
 * Loads environment variables from .env files based on active profile.
 * Supports .env.development and .env.production files.
 * 
 * This listener is registered in DashboardApplication.main() to ensure
 * it runs early enough to load .env files before other configuration.
 */
public class EnvironmentConfig implements ApplicationListener<ApplicationEnvironmentPreparedEvent> {

    private static final Logger logger = LoggerFactory.getLogger(EnvironmentConfig.class);

    @Override
    public void onApplicationEvent(@NonNull ApplicationEnvironmentPreparedEvent event) {
        ConfigurableEnvironment environment = event.getEnvironment();
        String activeProfile = environment.getActiveProfiles().length > 0 
            ? environment.getActiveProfiles()[0] 
            : environment.getProperty("spring.profiles.active", "dev");

        // Map profile names to .env file names
        String envFileName = ".env." + (activeProfile.equals("prod") ? "production" : "development");
        
        // Try multiple locations for .env file
        String[] possiblePaths = {
            envFileName,                                    // Root of project
            "dashboard/" + envFileName,                    // In dashboard folder
            "src/main/resources/" + envFileName,          // In resources
            "dashboard/src/main/resources/" + envFileName  // In dashboard/resources
        };

        Properties envProperties = new Properties();
        boolean loaded = false;

        for (String path : possiblePaths) {
            File envFile = new File(path);
            if (envFile.exists() && envFile.isFile()) {
                try (FileInputStream fis = new FileInputStream(envFile)) {
                    envProperties.load(fis);
                    environment.getPropertySources().addFirst(
                        new PropertiesPropertySource("envProperties", envProperties)
                    );
                    loaded = true;
                    logger.debug("Loaded environment variables from: {}", envFile.getAbsolutePath());
                    break;
                } catch (IOException e) {
                    logger.warn("Error loading .env file from {}: {}", path, e.getMessage());
                }
            }
        }

        if (!loaded) {
            logger.debug("No .env file found for profile: {}. Using default/application properties.", activeProfile);
        }
    }
}

