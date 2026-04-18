package com.dashboard.app.recruitment.repository;

import com.dashboard.app.recruitment.model.JobOpening;
import com.dashboard.app.recruitment.model.enums.JobStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobOpeningRepository extends JpaRepository<JobOpening, Long> {
    List<JobOpening> findAllByOrderByCreatedAtDesc();

    List<JobOpening> findByStatus(JobStatus status);

    @Query("SELECT COUNT(j) FROM JobOpening j WHERE j.status = :status")
    Long countByStatus(JobStatus status);

    @Query("SELECT COUNT(j) FROM JobOpening j WHERE j.status = :status AND j.numberOfOpenings > :numberOfOpenings")
    Long countByStatusAndNumberOfOpeningsGreaterThan(@Param("status") JobStatus status,
            @Param("numberOfOpenings") Integer numberOfOpenings);

    @Query("SELECT COUNT(j) FROM JobOpening j")
    Long countAll();

    @Query("SELECT SUM(j.numberOfOpenings) FROM JobOpening j")
    Long sumNumberOfOpenings();

    @Query("SELECT COUNT(j) FROM JobOpening j WHERE j.status = :status AND MONTH(j.updatedAt) = :month AND YEAR(j.updatedAt) = :year")
    Long countClosedThisMonth(JobStatus status, int month, int year);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT j FROM JobOpening j WHERE j.id = :id")
    Optional<JobOpening> findByIdWithLock(@Param("id") Long id);

    Optional<JobOpening> findById(Long id);
}
