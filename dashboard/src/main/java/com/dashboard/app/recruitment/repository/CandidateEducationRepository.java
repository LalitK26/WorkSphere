package com.dashboard.app.recruitment.repository;

import com.dashboard.app.recruitment.model.CandidateEducation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CandidateEducationRepository extends JpaRepository<CandidateEducation, Long> {
}
