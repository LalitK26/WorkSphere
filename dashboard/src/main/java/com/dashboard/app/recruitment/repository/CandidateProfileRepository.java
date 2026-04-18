package com.dashboard.app.recruitment.repository;

import com.dashboard.app.recruitment.model.CandidateProfile;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CandidateProfileRepository extends JpaRepository<CandidateProfile, Long> {
    
    @EntityGraph(attributePaths = {"education", "candidate"})
    Optional<CandidateProfile> findByCandidateId(Long candidateId);
    
    @EntityGraph(attributePaths = {"education", "candidate"})
    Optional<CandidateProfile> findById(Long id);
    
    @Query("SELECT DISTINCT p FROM CandidateProfile p " +
           "LEFT JOIN FETCH p.education " +
           "LEFT JOIN FETCH p.candidate c " +
           "LEFT JOIN FETCH c.role " +
           "WHERE p.candidate.id = :candidateId")
    Optional<CandidateProfile> findByCandidateIdWithEducation(@Param("candidateId") Long candidateId);
    
    @Query("SELECT DISTINCT p FROM CandidateProfile p " +
           "LEFT JOIN FETCH p.education " +
           "LEFT JOIN FETCH p.candidate c " +
           "LEFT JOIN FETCH c.role " +
           "WHERE p.id = :id")
    Optional<CandidateProfile> findByIdWithEducation(@Param("id") Long id);
}
