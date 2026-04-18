package com.dashboard.app.repository;

import com.dashboard.app.model.Shift;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShiftRepository extends JpaRepository<Shift, Long> {
    Optional<Shift> findFirstByNameIgnoreCase(String name);
    Optional<Shift> findTopByOrderByIdAsc();
}


