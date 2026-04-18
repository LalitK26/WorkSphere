package com.dashboard.app.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
public class CorsConfig {

    private static final Logger logger = LoggerFactory.getLogger(CorsConfig.class);

    @Value("${cors.allowed-origins:http://localhost:3000,http://localhost:3001,https://dashboard.worksphere.ltd,https://recruitment.worksphere.ltd}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Parse allowed origins from comma-separated string and trim whitespace
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());

        // IMPORTANT: When allowCredentials is true, we must use setAllowedOrigins with
        // exact origins
        // (not wildcards) OR use setAllowedOriginPatterns for pattern matching
        // Since we have specific origins, we'll use setAllowedOrigins
        configuration.setAllowedOrigins(origins);

        logger.info("CORS configured with allowed origins: {}", origins);

        // Allow common HTTP methods
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));

        // Allow all headers including those needed for file uploads
        // IMPORTANT: Using "*" is now supported with allowCredentials in Spring
        // Security 5.0+
        // This is critical for multipart/form-data uploads which include dynamic
        // boundaries
        // (e.g., "multipart/form-data; boundary=----WebKitFormBoundary...")
        configuration.setAllowedHeaders(Arrays.asList("*"));

        // Expose headers that the frontend might need
        configuration.setExposedHeaders(Arrays.asList(
                "Access-Control-Allow-Origin",
                "Access-Control-Allow-Credentials",
                "Content-Disposition"));

        // Allow credentials (cookies, authorization headers)
        configuration.setAllowCredentials(true);

        // Cache preflight response for 1 hour
        configuration.setMaxAge(3600L);

        // Apply CORS configuration to all endpoints
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
