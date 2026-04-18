package com.dashboard.app.repository;

import com.dashboard.app.model.Attendance;
import com.dashboard.app.model.enums.AttendanceStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    Optional<Attendance> findByUserIdAndAttendanceDate(Long userId, LocalDate date);
    List<Attendance> findByUserId(Long userId);
    List<Attendance> findByAttendanceDate(LocalDate date);
    List<Attendance> findByUserIdAndAttendanceDateBetween(Long userId, LocalDate startDate, LocalDate endDate);
    
    // Optimized query with JOIN FETCH to avoid N+1 queries
    @EntityGraph(attributePaths = {"user"})
    @Query("SELECT a FROM Attendance a WHERE a.attendanceDate BETWEEN :startDate AND :endDate")
    List<Attendance> findByAttendanceDateBetweenWithUser(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    // Optimized query for today's attendance with user data
    @EntityGraph(attributePaths = {"user"})
    @Query("SELECT a FROM Attendance a WHERE a.attendanceDate = :date")
    List<Attendance> findByAttendanceDateWithUser(@Param("date") LocalDate date);
    
    List<Attendance> findByAttendanceDateBetween(LocalDate startDate, LocalDate endDate);
    List<Attendance> findByStatus(AttendanceStatus status);
    
    @Query("SELECT a FROM Attendance a WHERE a.user.id = :userId AND YEAR(a.attendanceDate) = :year AND MONTH(a.attendanceDate) = :month")
    List<Attendance> findByUserIdAndMonth(@Param("userId") Long userId, @Param("year") int year, @Param("month") int month);

    @Query("SELECT a FROM Attendance a WHERE a.attendanceDate = :date AND a.clockIn IS NOT NULL AND a.clockOut IS NULL")
    List<Attendance> findClockedInWithoutClockOut(@Param("date") LocalDate date);

    void deleteByUserId(Long userId);
}

