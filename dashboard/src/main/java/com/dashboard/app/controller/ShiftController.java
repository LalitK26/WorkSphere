package com.dashboard.app.controller;

import com.dashboard.app.dto.request.ShiftRequest;
import com.dashboard.app.dto.response.ShiftResponse;
import com.dashboard.app.service.ShiftService;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shifts")
@CrossOrigin(origins = "*")
public class ShiftController {

    @Autowired
    private ShiftService shiftService;

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
    public ResponseEntity<List<ShiftResponse>> getShifts() {
        List<ShiftResponse> shifts = shiftService.getShifts();
        return ResponseEntity.ok(shifts);
    }

    @PostMapping
    public ResponseEntity<ShiftResponse> createShift(@Valid @RequestBody ShiftRequest request,
                                                     HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        ShiftResponse response = shiftService.createShift(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteShift(@PathVariable Long id, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        shiftService.deleteShift(id, userId);
        return ResponseEntity.noContent().build();
    }
}


