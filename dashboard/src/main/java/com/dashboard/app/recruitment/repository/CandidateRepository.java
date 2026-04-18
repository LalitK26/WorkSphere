package com.dashboard.app.recruitment.repository;

import com.dashboard.app.recruitment.model.Candidate;
import com.dashboard.app.model.enums.UserStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CandidateRepository extends JpaRepository<Candidate, Long> {
    Optional<Candidate> findByEmail(String email);
    
    @EntityGraph(attributePaths = {"role"})
    Optional<Candidate> findWithRoleByEmail(String email);
    
    @EntityGraph(attributePaths = {"role"})
    Optional<Candidate> findWithRoleById(Long id);
    
    List<Candidate> findByStatus(UserStatus status);
    boolean existsByEmail(String email);
    Optional<Candidate> findByVerificationToken(String verificationToken);
}

