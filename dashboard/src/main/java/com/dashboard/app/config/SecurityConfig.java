package com.dashboard.app.config;

import com.dashboard.app.service.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;
import jakarta.servlet.http.HttpServletResponse;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Autowired
    private JwtAuthFilter jwtAuthFilter;

    @Value("${cors.allowed-origins:http://localhost:3000,http://localhost:3001,https://dashboard.worksphere.ltd,https://recruitment.worksphere.ltd}")
    private String allowedOriginsConfig;

    private List<String> getAllowedOrigins() {
        return Arrays.stream(allowedOriginsConfig.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Autowired
    private CorsConfigurationSource corsConfigurationSource;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .exceptionHandling(ex -> {
                    ex.authenticationEntryPoint((request, response, authException) -> {
                        // Ensure CORS headers are added even to authentication errors
                        String origin = request.getHeader("Origin");
                        if (origin != null && getAllowedOrigins().contains(origin)) {
                            response.setHeader("Access-Control-Allow-Origin", origin);
                            response.setHeader("Access-Control-Allow-Credentials", "true");
                            response.setHeader("Access-Control-Allow-Methods",
                                    "GET, POST, PUT, DELETE, PATCH, OPTIONS");
                            response.setHeader("Access-Control-Allow-Headers",
                                    "Authorization, Content-Type, X-Requested-With, Accept, Origin");
                        }
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setContentType("application/json");
                        try {
                            response.getWriter().write("{\"message\":\"Unauthorized\",\"status\":\"UNAUTHORIZED\"}");
                        } catch (Exception e) {
                            // Ignore
                        }
                    });
                    ex.accessDeniedHandler((request, response, accessDeniedException) -> {
                        // Ensure CORS headers are added even to authorization errors
                        String origin = request.getHeader("Origin");
                        if (origin != null && getAllowedOrigins().contains(origin)) {
                            response.setHeader("Access-Control-Allow-Origin", origin);
                            response.setHeader("Access-Control-Allow-Credentials", "true");
                            response.setHeader("Access-Control-Allow-Methods",
                                    "GET, POST, PUT, DELETE, PATCH, OPTIONS");
                            response.setHeader("Access-Control-Allow-Headers",
                                    "Authorization, Content-Type, X-Requested-With, Accept, Origin");
                        }
                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        response.setContentType("application/json");
                        try {
                            response.getWriter().write("{\"message\":\"Access Denied\",\"status\":\"FORBIDDEN\"}");
                        } catch (Exception e) {
                            // Ignore
                        }
                    });
                })
                .authorizeHttpRequests(auth -> {
                    // Allow OPTIONS requests for CORS preflight
                    auth.requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll();
                    // Allow public auth endpoints for both dashboard and recruitment
                    auth.requestMatchers("/health", "/api/auth/**", "/api/recruitment/auth/**").permitAll();
                    // Allow WebSocket connections
                    auth.requestMatchers("/ws/**").permitAll();
                    // Allow candidates to access their profile management endpoints
                    auth.requestMatchers("/api/recruitment/candidates/**").authenticated();
                    // Allow public access to files (images need to be accessible for <img> tags)
                    // File paths are UUID-based and not easily guessable, providing reasonable
                    // security
                    auth.requestMatchers("/api/files/**").permitAll();
                    // Swagger endpoints - will be disabled in prod via springdoc config
                    auth.requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**",
                            "/swagger-resources/**", "/webjars/**").permitAll();
                    // All other requests require authentication
                    auth.anyRequest().authenticated();
                })
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
