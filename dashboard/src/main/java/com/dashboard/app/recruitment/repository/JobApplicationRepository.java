package com.dashboard.app.recruitment.repository;

import com.dashboard.app.recruitment.model.JobApplication;
import com.dashboard.app.recruitment.model.JobOpening;
import com.dashboard.app.recruitment.model.Candidate;
import com.dashboard.app.recruitment.model.enums.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {
    List<JobApplication> findByCandidateIdOrderByCreatedAtDesc(Long candidateId);
    
    List<JobApplication> findByJobOpeningId(Long jobOpeningId);
    
    Optional<JobApplication> findByJobOpeningIdAndCandidateId(Long jobOpeningId, Long candidateId);
    
    boolean existsByJobOpeningIdAndCandidateId(Long jobOpeningId, Long candidateId);
    
    @Query("SELECT COUNT(ja) FROM JobApplication ja WHERE ja.jobOpening.id = :jobOpeningId")
    Long countByJobOpeningId(Long jobOpeningId);
    
    @Query("SELECT ja FROM JobApplication ja JOIN FETCH ja.jobOpening WHERE ja.jobOpening.jobTitle = :jobTitle")
    List<JobApplication> findByJobTitle(String jobTitle);
    
    @Query("SELECT DISTINCT ja FROM JobApplication ja " +
           "LEFT JOIN FETCH ja.jobOpening " +
           "LEFT JOIN FETCH ja.candidate " +
           "WHERE ja.id = :id")
    Optional<JobApplication> findByIdWithDetails(@Param("id") Long id);
    
    @Query("SELECT jo.jobTitle, COUNT(ja.id) FROM JobApplication ja INNER JOIN ja.jobOpening jo WHERE jo.jobTitle IS NOT NULL GROUP BY jo.jobTitle")
    List<Object[]> getJobTitleStatistics();

    @Query("SELECT COUNT(ja) FROM JobApplication ja WHERE ja.jobOpening.id = :jobOpeningId AND ja.status = :status")
    Long countByJobOpeningIdAndStatus(@Param("jobOpeningId") Long jobOpeningId, @Param("status") ApplicationStatus status);
}
