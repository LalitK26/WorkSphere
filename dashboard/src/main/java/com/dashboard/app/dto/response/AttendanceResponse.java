package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String profilePictureUrl;
    private LocalDate attendanceDate;
    private String status;
    private LocalTime clockIn;
    private LocalTime clockOut;
    private Long durationMinutes;
    private Long breakMinutes;
    private String notes;
    
    // Location fields for clock-in
    private Double clockInLatitude;
    private Double clockInLongitude;
    private String clockInLocation;
    private String clockInWorkingFrom;
    
    // Location fields for clock-out
    private Double clockOutLatitude;
    private Double clockOutLongitude;
    private String clockOutLocation;
    private String clockOutWorkingFrom;
    
    private LocalDateTime createdAt;
}

