package com.dashboard.app.repository;

import com.dashboard.app.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    
    // Get all events ordered by start date and time (descending)
    List<Event> findAllByOrderByStartsOnDateDescStartsOnTimeDesc();
    
    // Get events for a specific employee
    @Query("SELECT DISTINCT e FROM Event e LEFT JOIN e.employees emp WHERE emp.id = :employeeId ORDER BY e.startsOnDate DESC, e.startsOnTime DESC")
    List<Event> findByEmployeeId(@Param("employeeId") Long employeeId);
    
    // Get events for a specific department
    @Query("SELECT DISTINCT e FROM Event e LEFT JOIN e.departments dept WHERE dept.id = :departmentId ORDER BY e.startsOnDate DESC, e.startsOnTime DESC")
    List<Event> findByDepartmentId(@Param("departmentId") Long departmentId);
}
