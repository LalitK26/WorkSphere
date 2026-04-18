package com.dashboard.app.recruitment.repository;

import com.dashboard.app.recruitment.model.ProctoringViolation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProctoringViolationRepository extends JpaRepository<ProctoringViolation, Long> {
    List<ProctoringViolation> findByInterviewIdOrderByTimestampDesc(Long interviewId);
}
