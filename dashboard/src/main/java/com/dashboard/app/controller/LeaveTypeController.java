package com.dashboard.app.controller;

import com.dashboard.app.dto.request.LeaveTypeRequest;
import com.dashboard.app.dto.response.LeaveTypeResponse;
import com.dashboard.app.exception.UnauthorizedException;
import com.dashboard.app.service.LeaveTypeService;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leave-types")
@CrossOrigin(origins = "*")
public class LeaveTypeController {

    @Autowired
    private LeaveTypeService leaveTypeService;

    @Autowired
    private JwtUtil jwtUtil;

    private Long getCurrentUserId(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            return jwtUtil.extractUserId(token);
        }
        throw new UnauthorizedException("Authorization header missing");
    }

    private String getCurrentUserRole(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            return jwtUtil.extractRole(token);
        }
        return null;
    }

    @PostMapping
    public ResponseEntity<LeaveTypeResponse> createLeaveType(@Valid @RequestBody LeaveTypeRequest request) {
        LeaveTypeResponse response = leaveTypeService.createLeaveType(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<LeaveTypeResponse> updateLeaveType(@PathVariable Long id, @Valid @RequestBody LeaveTypeRequest request) {
        LeaveTypeResponse response = leaveTypeService.updateLeaveType(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeaveTypeResponse> getLeaveTypeById(@PathVariable Long id) {
        LeaveTypeResponse response = leaveTypeService.getLeaveTypeById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<LeaveTypeResponse>> getAllLeaveTypes(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                String role = jwtUtil.extractRole(token);
                if ("ADMIN".equalsIgnoreCase(role)) {
                    List<LeaveTypeResponse> responses = leaveTypeService.getAllLeaveTypes();
                    return ResponseEntity.ok(responses);
                }
                Long userId = jwtUtil.extractUserId(token);
                List<LeaveTypeResponse> responses = leaveTypeService.getApplicableLeaveTypes(userId);
                return ResponseEntity.ok(responses);
            } catch (Exception e) {
                // If user context not available, return all
                List<LeaveTypeResponse> responses = leaveTypeService.getAllLeaveTypes();
                return ResponseEntity.ok(responses);
            }
        }
        List<LeaveTypeResponse> responses = leaveTypeService.getAllLeaveTypes();
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/applicable")
    public ResponseEntity<List<LeaveTypeResponse>> getApplicableLeaveTypes(
            @RequestParam(value = "userId", required = false) Long userId,
            HttpServletRequest request) {
        Long resolvedUserId;
        if (userId != null) {
            String role = getCurrentUserRole(request);
            if (role != null && "ADMIN".equalsIgnoreCase(role)) {
                resolvedUserId = userId;
            } else {
                resolvedUserId = getCurrentUserId(request);
            }
        } else {
            resolvedUserId = getCurrentUserId(request);
        }
        List<LeaveTypeResponse> responses = leaveTypeService.getApplicableLeaveTypes(resolvedUserId);
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLeaveType(@PathVariable Long id) {
        leaveTypeService.deleteLeaveType(id);
        return ResponseEntity.noContent().build();
    }
}

