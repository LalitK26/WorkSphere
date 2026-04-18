package com.dashboard.app.repository;

import com.dashboard.app.model.Leave;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveRepository extends JpaRepository<Leave, Long> {
    @Query("SELECT l FROM Leave l LEFT JOIN FETCH l.user LEFT JOIN FETCH l.leaveType WHERE l.user.id = :userId")
    List<Leave> findByUserId(@Param("userId") Long userId);
    
    void deleteByUserId(Long userId);
    
    @Query("SELECT l FROM Leave l LEFT JOIN FETCH l.user LEFT JOIN FETCH l.leaveType WHERE l.user.id = :userId AND l.startDate BETWEEN :start AND :end")
    List<Leave> findByUserIdAndStartDateBetween(@Param("userId") Long userId, @Param("start") LocalDate start, @Param("end") LocalDate end);
    
    @Query("SELECT DISTINCT l FROM Leave l LEFT JOIN FETCH l.user LEFT JOIN FETCH l.leaveType WHERE l.startDate <= :endDate AND l.endDate >= :startDate")
    List<Leave> findByDateRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    @Query("SELECT l FROM Leave l LEFT JOIN FETCH l.user LEFT JOIN FETCH l.leaveType WHERE l.user.id = :userId AND l.startDate <= :endDate AND l.endDate >= :startDate")
    List<Leave> findByUserIdAndDateRange(@Param("userId") Long userId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    @Query("SELECT DISTINCT l FROM Leave l LEFT JOIN FETCH l.user LEFT JOIN FETCH l.leaveType")
    List<Leave> findAllWithRelations();
    
    @Query("SELECT l FROM Leave l LEFT JOIN FETCH l.user LEFT JOIN FETCH l.leaveType WHERE l.id = :id")
    java.util.Optional<Leave> findByIdWithRelations(@Param("id") Long id);
}

