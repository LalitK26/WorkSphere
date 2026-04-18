package com.dashboard.app.repository;

import com.dashboard.app.model.ShiftAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ShiftAssignmentRepository extends JpaRepository<ShiftAssignment, Long> {
    Optional<ShiftAssignment> findByUserIdAndShiftDate(Long userId, LocalDate shiftDate);

    List<ShiftAssignment> findByShiftDateBetween(LocalDate start, LocalDate end);

    List<ShiftAssignment> findByUserIdInAndShiftDateBetween(List<Long> userIds, LocalDate start, LocalDate end);

    boolean existsByShiftId(Long shiftId);

    void deleteByUserId(Long userId);
}


