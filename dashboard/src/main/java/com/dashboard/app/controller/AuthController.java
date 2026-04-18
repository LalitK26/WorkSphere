package com.dashboard.app.controller;

import com.dashboard.app.dto.request.LoginRequest;
import com.dashboard.app.dto.response.AuthResponse;
import com.dashboard.app.dto.response.RolePermissionsResponse;
import com.dashboard.app.service.AuthService;
import com.dashboard.app.service.RoleService;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private RoleService roleService;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me/permissions")
    public ResponseEntity<RolePermissionsResponse> getCurrentUserPermissions(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            Long userId = jwtUtil.extractUserId(token);
            // Get user's role ID from user repository
            Long roleId = authService.getUserRoleId(userId);
            if (roleId != null) {
                RolePermissionsResponse response = roleService.getRolePermissions(roleId);
                return ResponseEntity.ok(response);
            }
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        // JWT tokens are stateless, so logout is primarily a client-side operation
        // This endpoint exists to prevent 500 errors when frontend calls it
        // In a stateless JWT system, tokens are invalidated client-side by removing them
        Map<String, String> response = new HashMap<>();
        response.put("message", "Logged out successfully");
        return ResponseEntity.ok(response);
    }
}
