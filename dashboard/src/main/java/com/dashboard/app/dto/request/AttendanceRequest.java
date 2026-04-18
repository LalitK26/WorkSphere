package com.dashboard.app.dto.request;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class AttendanceRequest {
    private Long userId;
    private LocalDate attendanceDate;
    private String status;
    private LocalTime clockIn;
    private LocalTime clockOut;
    private Long durationMinutes;
    private Long breakMinutes;
    private String notes;
}

