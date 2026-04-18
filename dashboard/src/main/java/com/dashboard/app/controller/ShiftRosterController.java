package com.dashboard.app.controller;

import com.dashboard.app.dto.request.BulkShiftAssignmentRequest;
import com.dashboard.app.dto.request.ShiftUpdateRequest;
import com.dashboard.app.dto.response.ShiftAssignmentResponse;
import com.dashboard.app.dto.response.ShiftRosterResponse;
import com.dashboard.app.service.ShiftAssignmentService;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/shift-roster")
@CrossOrigin(origins = "*")
public class ShiftRosterController {

    @Autowired
    private ShiftAssignmentService shiftAssignmentService;

    @Autowired
    private JwtUtil jwtUtil;

    private Long getCurrentUserId(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return jwtUtil.extractUserId(authHeader.substring(7));
        }
        return null;
    }

    @GetMapping
    public ResponseEntity<ShiftRosterResponse> getRoster(@RequestParam int year,
                                                         @RequestParam int month,
                                                         @RequestParam(required = false) String search,
                                                         @RequestParam(required = false, defaultValue = "0") int page,
                                                         @RequestParam(required = false, defaultValue = "10") int size,
                                                         HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        ShiftRosterResponse response = shiftAssignmentService.getRoster(year, month, userId, search, page, size);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/assign")
    public ResponseEntity<Void> assignBulk(@Valid @RequestBody BulkShiftAssignmentRequest bulkRequest,
                                           HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        shiftAssignmentService.assignBulkShift(bulkRequest, userId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/update")
    public ResponseEntity<ShiftAssignmentResponse> updateSingle(@Valid @RequestBody ShiftUpdateRequest updateRequest,
                                                                HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        ShiftAssignmentResponse response = shiftAssignmentService.upsertSingleShift(updateRequest, userId);
        return ResponseEntity.ok(response);
    }
}


