package com.dashboard.app.service;

import com.dashboard.app.dto.request.LoginRequest;
import com.dashboard.app.dto.response.AuthResponse;
import com.dashboard.app.exception.UnauthorizedException;
import com.dashboard.app.model.User;
import com.dashboard.app.repository.UserRepository;
import com.dashboard.app.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AuthenticationManager authenticationManager;

    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (Exception e) {
            logger.error("Authentication failed for email: " + request.getEmail(), e);
            throw new UnauthorizedException("Invalid email or password");
        }

        // Load user once with role fetched using optimized query
        User user = userRepository.findWithRoleByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Check if user has a role
        if (user.getRole() == null) {
            throw new UnauthorizedException("User role not found. Please contact administrator.");
        }

        if (user.getRole().getType() == null) {
            throw new UnauthorizedException("User role type not found. Please contact administrator.");
        }

        // Create UserDetails from loaded user
        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                new java.util.ArrayList<>()
        );

        String token = jwtUtil.generateToken(userDetails, user.getId(), user.getRole().getType().name());

        return new AuthResponse(
                token,
                "Bearer",
                user.getId(),
                user.getEmail(),
                user.getRole().getType().name(),
                user.getFullName(),
                null, // Phone number
                true  // isProfileComplete
        );
    }

    public Long getUserRoleId(Long userId) {
        User user = userRepository.findWithRoleById(userId)
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        if (user.getRole() == null) {
            throw new UnauthorizedException("User role not found");
        }
        return user.getRole().getId();
    }
}

