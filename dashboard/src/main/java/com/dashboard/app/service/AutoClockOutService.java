package com.dashboard.app.service;

import com.dashboard.app.model.Attendance;
import com.dashboard.app.repository.AttendanceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

@Service
public class AutoClockOutService {

    private static final Logger logger = LoggerFactory.getLogger(AutoClockOutService.class);
    private static final int AUTO_CLOCK_OUT_HOURS = 10;

    @Autowired
    private AttendanceRepository attendanceRepository;

    /**
     * Scheduled task that runs every hour to check for employees who have been clocked in
     * for 10 hours and automatically clock them out
     */
    @Scheduled(cron = "0 0 * * * ?") // Runs every hour at minute 0
    @Transactional
    public void autoClockOutAfter10Hours() {
        try {
            // Use UTC timezone to match database timezone
            ZonedDateTime nowUtc = ZonedDateTime.now(ZoneId.of("UTC"));
            LocalDate today = nowUtc.toLocalDate();
            LocalDate yesterday = today.minusDays(1);
            LocalTime currentTime = nowUtc.toLocalTime();
            LocalDateTime currentDateTime = LocalDateTime.of(today, currentTime);
            
            // Find all employees who are clocked in but not clocked out today and yesterday
            // (yesterday check handles cases where someone clocked in late at night)
            List<Attendance> todayClockedIn = attendanceRepository.findClockedInWithoutClockOut(today);
            List<Attendance> yesterdayClockedIn = attendanceRepository.findClockedInWithoutClockOut(yesterday);
            
            int autoClockOutCount = 0;
            
            // Process today's clocked-in employees
            for (Attendance attendance : todayClockedIn) {
                if (processAutoClockOut(attendance, currentDateTime, currentTime)) {
                    autoClockOutCount++;
                }
            }
            
            // Process yesterday's clocked-in employees (in case they clocked in late and are still clocked in)
            for (Attendance attendance : yesterdayClockedIn) {
                if (processAutoClockOut(attendance, currentDateTime, currentTime)) {
                    autoClockOutCount++;
                }
            }
            
            if (autoClockOutCount > 0) {
                logger.info("Auto clocked out {} employee(s) after {} hours", autoClockOutCount, AUTO_CLOCK_OUT_HOURS);
            }
        } catch (Exception e) {
            logger.error("Error in auto clock out scheduled task", e);
        }
    }
    
    /**
     * Helper method to process auto clock out for a single attendance record
     */
    private boolean processAutoClockOut(Attendance attendance, LocalDateTime currentDateTime, LocalTime currentTime) {
        if (attendance.getClockIn() != null && attendance.getClockOut() == null) {
            LocalTime clockInTime = attendance.getClockIn();
            LocalDate attendanceDate = attendance.getAttendanceDate();
            
            // Create LocalDateTime from attendance date and clock in time to handle day boundaries correctly
            LocalDateTime clockInDateTime = LocalDateTime.of(attendanceDate, clockInTime);
            
            // Calculate duration between clock in and current time
            Duration duration = Duration.between(clockInDateTime, currentDateTime);
            long hoursElapsed = duration.toHours();
            
            // If 10 hours or more have passed, auto clock out
            if (hoursElapsed >= AUTO_CLOCK_OUT_HOURS) {
                attendance.setClockOut(currentTime);
                attendance.setDurationMinutes(duration.toMinutes());
                attendanceRepository.save(attendance);
                
                logger.info("Auto clocked out user {} after {} hours (clocked in at {} on {})", 
                    attendance.getUser().getId(), hoursElapsed, clockInTime, attendanceDate);
                return true;
            }
        }
        return false;
    }
}

