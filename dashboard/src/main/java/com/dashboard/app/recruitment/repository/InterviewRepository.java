package com.dashboard.app.recruitment.repository;

import com.dashboard.app.recruitment.model.Interview;
import com.dashboard.app.recruitment.model.enums.InterviewRound;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewRepository extends JpaRepository<Interview, Long> {
        List<Interview> findByInterviewAssignmentId(Long interviewAssignmentId);

        @Query("SELECT i FROM Interview i JOIN FETCH i.interviewAssignment ia JOIN FETCH ia.interviewer JOIN FETCH ia.candidate JOIN FETCH ia.jobApplication ja JOIN FETCH ja.jobOpening WHERE ia.interviewer.id = :interviewerId AND (i.interviewRound = com.dashboard.app.recruitment.model.enums.InterviewRound.TECHNICAL OR i.interviewRound IS NULL)")
        List<Interview> findByInterviewerId(@Param("interviewerId") Long interviewerId);

        @Query("SELECT i FROM Interview i JOIN FETCH i.interviewAssignment ia LEFT JOIN FETCH ia.assignedBy JOIN FETCH ia.interviewer JOIN FETCH ia.candidate JOIN FETCH ia.jobApplication ja JOIN FETCH ja.jobOpening jo LEFT JOIN FETCH jo.createdBy LEFT JOIN FETCH i.assignedRecruiter WHERE i.interviewRound = com.dashboard.app.recruitment.model.enums.InterviewRound.HR AND (jo.createdBy.id = :recruiterId OR ia.assignedBy.id = :recruiterId OR i.assignedRecruiter.id = :recruiterId)")
        List<Interview> findHRInterviewsByRecruiterId(@Param("recruiterId") Long recruiterId);

        @Query("SELECT i FROM Interview i JOIN FETCH i.interviewAssignment ia LEFT JOIN FETCH ia.assignedBy JOIN FETCH ia.interviewer JOIN FETCH ia.candidate JOIN FETCH ia.jobApplication ja JOIN FETCH ja.jobOpening jo LEFT JOIN FETCH jo.createdBy LEFT JOIN FETCH i.assignedRecruiter WHERE i.interviewRound = com.dashboard.app.recruitment.model.enums.InterviewRound.HR AND (jo.createdBy.id = :recruiterId OR ia.assignedBy.id = :recruiterId OR i.assignedRecruiter.id = :recruiterId)")
        org.springframework.data.domain.Page<Interview> findHRInterviewsByRecruiterId(
                        @Param("recruiterId") Long recruiterId, org.springframework.data.domain.Pageable pageable);

        @Query("SELECT i FROM Interview i JOIN FETCH i.interviewAssignment ia WHERE ia.jobApplication.id = :jobApplicationId AND i.interviewRound = com.dashboard.app.recruitment.model.enums.InterviewRound.TECHNICAL AND i.result = com.dashboard.app.recruitment.model.enums.InterviewResult.SHORTLISTED ORDER BY i.createdAt DESC")
        List<Interview> findShortlistedTechnicalInterviewByJobApplicationId(
                        @Param("jobApplicationId") Long jobApplicationId);

        @Query("SELECT i FROM Interview i JOIN FETCH i.interviewAssignment ia LEFT JOIN FETCH ia.assignedBy JOIN FETCH ia.interviewer JOIN FETCH ia.candidate JOIN FETCH ia.jobApplication ja JOIN FETCH ja.jobOpening jo LEFT JOIN FETCH jo.createdBy LEFT JOIN FETCH i.assignedRecruiter WHERE i.interviewRound = com.dashboard.app.recruitment.model.enums.InterviewRound.HR")
        List<Interview> findAllHRInterviews();

        @Query("SELECT i FROM Interview i JOIN FETCH i.interviewAssignment ia LEFT JOIN FETCH ia.assignedBy JOIN FETCH ia.interviewer JOIN FETCH ia.candidate JOIN FETCH ia.jobApplication ja JOIN FETCH ja.jobOpening jo LEFT JOIN FETCH jo.createdBy LEFT JOIN FETCH i.assignedRecruiter WHERE i.interviewRound = com.dashboard.app.recruitment.model.enums.InterviewRound.HR")
        org.springframework.data.domain.Page<Interview> findAllHRInterviews(
                        org.springframework.data.domain.Pageable pageable);

        @Query("SELECT i FROM Interview i JOIN FETCH i.interviewAssignment ia JOIN FETCH ia.interviewer JOIN FETCH ia.candidate JOIN FETCH ia.jobApplication ja JOIN FETCH ja.jobOpening WHERE (i.interviewRound IS NULL OR i.interviewRound = com.dashboard.app.recruitment.model.enums.InterviewRound.TECHNICAL) AND (i.status = com.dashboard.app.recruitment.model.enums.InterviewStatus.SCHEDULED OR i.status = com.dashboard.app.recruitment.model.enums.InterviewStatus.RESCHEDULED)")
        org.springframework.data.domain.Page<Interview> findAllTechnicalInterviews(
                        org.springframework.data.domain.Pageable pageable);

        @Query("SELECT i FROM Interview i JOIN FETCH i.interviewAssignment ia JOIN FETCH ia.interviewer JOIN FETCH ia.candidate JOIN FETCH ia.jobApplication ja JOIN FETCH ja.jobOpening jo JOIN FETCH jo.createdBy WHERE ia.candidate.id = :candidateId ORDER BY i.interviewDate ASC, i.interviewTime ASC")
        List<Interview> findByCandidateId(@Param("candidateId") Long candidateId);

        @Query("SELECT i FROM Interview i JOIN FETCH i.interviewAssignment ia JOIN FETCH ia.interviewer JOIN FETCH ia.candidate JOIN FETCH ia.jobApplication ja JOIN FETCH ja.jobOpening jo JOIN FETCH jo.createdBy WHERE ia.candidate.id = :candidateId AND i.interviewDate >= :fromDate ORDER BY i.interviewDate ASC, i.interviewTime ASC")
        List<Interview> findByCandidateIdAndDateFrom(@Param("candidateId") Long candidateId,
                        @Param("fromDate") LocalDate fromDate);

        Optional<Interview> findFirstByInterviewAssignment_JobApplication_IdAndInterviewRoundOrderByCreatedAtDesc(
                        Long jobApplicationId, InterviewRound interviewRound);
}
