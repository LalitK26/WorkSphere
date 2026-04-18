package com.dashboard.app.recruitment.repository;

import com.dashboard.app.recruitment.model.PendingCandidate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PendingCandidateRepository extends JpaRepository<PendingCandidate, Long> {
    Optional<PendingCandidate> findByEmail(String email);
    void deleteByEmail(String email);
}
