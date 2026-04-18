package com.dashboard.app.controller;

import com.dashboard.app.dto.request.LeaveRequest;
import com.dashboard.app.dto.response.LeaveQuotaResponse;
import com.dashboard.app.dto.response.LeaveResponse;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.service.LeaveService;
import com.dashboard.app.service.PermissionService;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/leaves")
@CrossOrigin(origins = "*")
public class LeaveController {

    @Autowired
    private LeaveService leaveService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PermissionService permissionService;

    private Long getCurrentUserId(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new BadRequestException("Missing or invalid Authorization header");
        }
        String token = authHeader.substring(7);
        return jwtUtil.extractUserId(token);
    }

    @PostMapping
    public ResponseEntity<LeaveResponse> createLeave(@Valid @RequestBody LeaveRequest request, HttpServletRequest httpRequest) {
        Long currentUserId = getCurrentUserId(httpRequest);
        String addPermission = permissionService.getModulePermission(currentUserId, "Leaves", "add");
        // If user doesn't have "All" permission, they can only create leaves for themselves
        if (!"All".equals(addPermission) && !request.getUserId().equals(currentUserId)) {
            request.setUserId(currentUserId);
        }
        // If user doesn't have "All" permission, status must be PENDING
        if (!"All".equals(addPermission)) {
            request.setStatus("PENDING");
        }
        LeaveResponse response = leaveService.createLeave(request, currentUserId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<LeaveResponse> updateLeave(@PathVariable Long id, @Valid @RequestBody LeaveRequest request, HttpServletRequest httpRequest) {
        Long currentUserId = getCurrentUserId(httpRequest);
        String updatePermission = permissionService.getModulePermission(currentUserId, "Leaves", "update");
        // If user doesn't have "All" permission, they can't change status (approve/reject)
        if (!"All".equals(updatePermission)) {
            // Employees can't change status
            request.setStatus(null);
        }
        LeaveResponse response = leaveService.updateLeave(id, request, currentUserId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<LeaveResponse> getLeaveById(@PathVariable Long id, HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        LeaveResponse response = leaveService.getLeaveById(id, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<LeaveResponse>> getAllLeaves(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) Long leaveTypeId,
            @RequestParam(required = false) String status,
            HttpServletRequest request) {
        Long currentUserId = getCurrentUserId(request);
        String viewPermission = permissionService.getModulePermission(currentUserId, "Leaves", "view");
        
        // If user doesn't have "All" permission, only show their own leaves
        if (!"All".equals(viewPermission)) {
            userId = currentUserId;
        }
        
        List<LeaveResponse> responses = leaveService.getAllLeaves(startDate, endDate, userId, leaveTypeId, status, currentUserId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/my-leaves")
    public ResponseEntity<List<LeaveResponse>> getMyLeaves(HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        List<LeaveResponse> responses = leaveService.getMyLeaves(userId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/quota")
    public ResponseEntity<List<LeaveQuotaResponse>> getLeaveQuota(HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        List<LeaveQuotaResponse> responses = leaveService.getLeaveQuota(userId);
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLeave(@PathVariable Long id, HttpServletRequest request) {
        Long currentUserId = getCurrentUserId(request);
        leaveService.deleteLeave(id, currentUserId);
        return ResponseEntity.noContent().build();
    }
}

