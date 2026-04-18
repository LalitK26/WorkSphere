package com.dashboard.app.controller;

import com.dashboard.app.dto.request.AttendanceRequest;
import com.dashboard.app.dto.request.BulkAttendanceRequest;
import com.dashboard.app.dto.request.ClockInRequest;
import com.dashboard.app.dto.request.ClockOutRequest;
import com.dashboard.app.dto.response.AttendanceResponse;
import com.dashboard.app.dto.response.AttendanceLocationResponse;
import com.dashboard.app.service.AttendanceService;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = "*")
public class AttendanceController {

    @Autowired
    private AttendanceService attendanceService;

    @Autowired
    private JwtUtil jwtUtil;

    private Long getCurrentUserId(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            return jwtUtil.extractUserId(token);
        }
        return null;
    }

    @PostMapping
    public ResponseEntity<AttendanceResponse> markAttendance(@Valid @RequestBody AttendanceRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        AttendanceResponse response = attendanceService.markAttendance(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PostMapping("/bulk")
    public ResponseEntity<List<AttendanceResponse>> markBulkAttendance(@Valid @RequestBody BulkAttendanceRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        List<AttendanceResponse> responses = attendanceService.markBulkAttendance(request, userId);
        return new ResponseEntity<>(responses, HttpStatus.CREATED);
    }

    @PostMapping("/clock-in")
    public ResponseEntity<AttendanceResponse> clockIn(
            @RequestBody(required = false) ClockInRequest clockInRequest,
            HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        AttendanceResponse response = attendanceService.clockIn(userId, clockInRequest);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/clock-out")
    public ResponseEntity<AttendanceResponse> clockOut(
            @RequestBody(required = false) ClockOutRequest clockOutRequest,
            HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        AttendanceResponse response = attendanceService.clockOut(userId, clockOutRequest);
        return ResponseEntity.ok(response);
    }
    
    @PutMapping("/update-location")
    public ResponseEntity<AttendanceResponse> updateLocation(
            @RequestBody(required = false) ClockInRequest clockInRequest,
            HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        AttendanceResponse response = attendanceService.updateTodayLocation(userId, clockInRequest);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/today-locations")
    public ResponseEntity<List<AttendanceLocationResponse>> getTodayLocations(HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        // Check if user is admin by extracting role from token
        String authHeader = request.getHeader("Authorization");
        boolean isAdmin = false;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            String role = jwtUtil.extractClaim(token, claims -> claims.get("role", String.class));
            isAdmin = "ADMIN".equals(role);
        }
        List<AttendanceLocationResponse> responses = attendanceService.getTodayAttendanceLocationsForMap(userId, isAdmin);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/today-clocked-in")
    public ResponseEntity<List<AttendanceLocationResponse>> getTodayClockedInForDashboard(HttpServletRequest request) {
        // All employees can see the list of clocked-in employees for dashboard display
        List<AttendanceLocationResponse> responses = attendanceService.getTodayClockedInForDashboard();
        return ResponseEntity.ok(responses);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AttendanceResponse> updateAttendance(@PathVariable Long id, @Valid @RequestBody AttendanceRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        AttendanceResponse response = attendanceService.updateAttendance(id, request, userId);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAttendance(@PathVariable Long id, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        attendanceService.deleteAttendance(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<AttendanceResponse> getAttendanceById(@PathVariable Long id, HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        AttendanceResponse response = attendanceService.getAttendanceById(id, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-attendance")
    public ResponseEntity<List<AttendanceResponse>> getMyAttendance(HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        List<AttendanceResponse> responses = attendanceService.getAttendanceByUserId(userId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/month")
    public ResponseEntity<List<AttendanceResponse>> getAttendanceByMonth(
            @RequestParam int year,
            @RequestParam int month,
            HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        // Use getAllAttendanceByMonth which checks permissions
        List<AttendanceResponse> responses = attendanceService.getAllAttendanceByMonth(year, month, userId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/all-month")
    public ResponseEntity<List<AttendanceResponse>> getAllAttendanceByMonth(
            @RequestParam int year,
            @RequestParam int month,
            HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        List<AttendanceResponse> responses = attendanceService.getAllAttendanceByMonth(year, month, userId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/employee/{employeeId}/month")
    public ResponseEntity<List<AttendanceResponse>> getEmployeeAttendanceByMonth(
            @PathVariable Long employeeId,
            @RequestParam int year,
            @RequestParam int month) {
        List<AttendanceResponse> responses = attendanceService.getAttendanceByMonth(employeeId, year, month);
        return ResponseEntity.ok(responses);
    }
}

