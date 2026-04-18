package com.dashboard.app.recruitment.model;

import com.dashboard.app.recruitment.model.enums.InterviewResult;
import com.dashboard.app.recruitment.model.enums.InterviewRound;
import com.dashboard.app.recruitment.model.enums.InterviewStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "interviews")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Interview {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "interview_assignment_id", nullable = false)
    private InterviewAssignment interviewAssignment;

    @Column(name = "interview_date", nullable = false)
    private LocalDate interviewDate;

    @Column(name = "interview_time", nullable = false)
    private LocalTime interviewTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private InterviewStatus status = InterviewStatus.SCHEDULED;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "meet_link", length = 500)
    private String meetLink;

    @Enumerated(EnumType.STRING)
    @Column(name = "interview_round", nullable = false, length = 50)
    private InterviewRound interviewRound = InterviewRound.TECHNICAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "result", nullable = false, length = 50)
    private InterviewResult result = InterviewResult.PENDING;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_recruiter_id")
    private RecruitmentUser assignedRecruiter;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
