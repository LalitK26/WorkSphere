package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceLocationResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String profilePictureUrl;
    private LocalDate attendanceDate;
    private LocalTime clockIn;
    private LocalTime clockOut;
    private Double clockInLatitude;
    private Double clockInLongitude;
    private String clockInLocation;
    private String clockInWorkingFrom;
    private Double clockOutLatitude;
    private Double clockOutLongitude;
    private String clockOutLocation;
    private String clockOutWorkingFrom;
}




