package com.dashboard.app.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkAttendanceRequest {
    @NotNull
    private List<Long> employeeIds;
    
    private String department;
    private String location;
    
    @NotNull
    private String markBy; // "month" or "date"
    
    private Integer year;
    private Integer month;
    private LocalDate fromDate;
    private LocalDate toDate;
    
    @NotNull
    private LocalTime clockIn;
    private String clockInLocation;
    private String clockInWorkingFrom;
    
    private LocalTime clockOut;
    private String clockOutLocation;
    private String clockOutWorkingFrom;
    
    private Boolean late = false;
    private Boolean halfDay = false;
    private Boolean attendanceOverwrite = false;
    
    private String notes;
}
