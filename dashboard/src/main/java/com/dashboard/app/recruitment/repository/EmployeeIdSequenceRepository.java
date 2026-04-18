package com.dashboard.app.recruitment.repository;

import com.dashboard.app.recruitment.model.EmployeeIdSequence;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmployeeIdSequenceRepository extends JpaRepository<EmployeeIdSequence, Integer> {
    
    /**
     * Find the sequence with pessimistic write lock for thread-safety
     * This ensures only one transaction can read/write the sequence at a time
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM EmployeeIdSequence e WHERE e.id = 1")
    Optional<EmployeeIdSequence> findByIdWithLock();
}
