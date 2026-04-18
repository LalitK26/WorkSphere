package com.dashboard.app.controller;

import com.dashboard.app.dto.request.HolidayRequest;
import com.dashboard.app.dto.response.HolidayResponse;
import com.dashboard.app.service.HolidayService;
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
@RequestMapping("/api/holidays")
@CrossOrigin(origins = "*")
public class HolidayController {

    @Autowired
    private HolidayService holidayService;

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
    public ResponseEntity<HolidayResponse> createHoliday(@Valid @RequestBody HolidayRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        HolidayResponse response = holidayService.createHoliday(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<HolidayResponse> updateHoliday(
            @PathVariable Long id,
            @Valid @RequestBody HolidayRequest request,
            HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        HolidayResponse response = holidayService.updateHoliday(id, request, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<HolidayResponse> getHolidayById(@PathVariable Long id, HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        HolidayResponse response = holidayService.getHolidayById(id, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<HolidayResponse>> getAllHolidays(
            HttpServletRequest request,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        List<HolidayResponse> responses = holidayService.getAllHolidays(request, search, startDate, endDate);
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHoliday(@PathVariable Long id, HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        holidayService.deleteHoliday(id, userId);
        return ResponseEntity.noContent().build();
    }
}

