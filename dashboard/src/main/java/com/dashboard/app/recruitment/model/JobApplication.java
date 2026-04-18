package com.dashboard.app.recruitment.model;

import com.dashboard.app.recruitment.model.enums.ApplicationStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "job_applications", uniqueConstraints = @UniqueConstraint(columnNames = { "job_opening_id",
        "candidate_id" }, name = "uk_job_application_job_candidate"))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobApplication {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "job_opening_id", nullable = false)
    private JobOpening jobOpening;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ApplicationStatus status = ApplicationStatus.PENDING;

    @Column(name = "cover_letter", columnDefinition = "TEXT")
    private String coverLetter;

    // Stage-specific completion status - tracks each stage independently
    @Column(name = "screening_status", length = 20)
    private String screeningStatus = "PENDING"; // PENDING, PASSED, REJECTED

    @Column(name = "technical_status", length = 20)
    private String technicalStatus = "PENDING"; // PENDING, PASSED, REJECTED

    @Column(name = "hr_status", length = 20)
    private String hrStatus = "PENDING"; // PENDING, PASSED, REJECTED

    @Column(name = "offer_status", length = 20)
    private String offerStatus = "PENDING"; // PENDING, SENT, ACCEPTED, REJECTED

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
