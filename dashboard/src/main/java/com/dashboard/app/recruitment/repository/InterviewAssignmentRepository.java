package com.dashboard.app.recruitment.repository;

import com.dashboard.app.recruitment.model.InterviewAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewAssignmentRepository extends JpaRepository<InterviewAssignment, Long> {
    List<InterviewAssignment> findByInterviewerId(Long interviewerId);
    
    List<InterviewAssignment> findByCandidateId(Long candidateId);
    
    List<InterviewAssignment> findByJobApplicationId(Long jobApplicationId);
    
    @Query("SELECT ia FROM InterviewAssignment ia JOIN FETCH ia.interviewer JOIN FETCH ia.candidate JOIN FETCH ia.jobApplication ja JOIN FETCH ja.jobOpening WHERE ia.interviewer.id = :interviewerId")
    List<InterviewAssignment> findByInterviewerIdWithDetails(Long interviewerId);
    
    @Query("SELECT ia FROM InterviewAssignment ia JOIN FETCH ia.interviewer JOIN FETCH ia.candidate JOIN FETCH ia.jobApplication ja JOIN FETCH ja.jobOpening WHERE ia.candidate.id = :candidateId")
    List<InterviewAssignment> findByCandidateIdWithDetails(Long candidateId);
    
    Optional<InterviewAssignment> findByInterviewerIdAndCandidateIdAndJobApplicationId(
        Long interviewerId, Long candidateId, Long jobApplicationId);
}

