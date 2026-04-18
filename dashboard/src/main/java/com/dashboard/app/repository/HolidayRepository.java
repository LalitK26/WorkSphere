package com.dashboard.app.repository;

import com.dashboard.app.model.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, Long> {
    List<Holiday> findByDateBetween(LocalDate startDate, LocalDate endDate);
    
    List<Holiday> findByDate(LocalDate date);
    
    @Query("SELECT h FROM Holiday h WHERE h.date >= :startDate AND h.date <= :endDate ORDER BY h.date ASC")
    List<Holiday> findHolidaysInDateRange(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
    
    @Query("SELECT h FROM Holiday h WHERE LOWER(h.occasion) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    List<Holiday> searchByOccasion(@Param("searchTerm") String searchTerm);
}

