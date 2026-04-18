package com.dashboard.app.recruitment.model;

import com.dashboard.app.recruitment.model.enums.OfferStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "offer_letters")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OfferLetter {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "job_opening_id", nullable = false)
    private JobOpening jobOpening;

    @Column(name = "employee_id", unique = true, nullable = false)
    private String employeeId;

    @Column(name = "job_title", nullable = false)
    private String jobTitle;

    @Column(name = "position", nullable = false)
    private String position;

    @Column(name = "department", nullable = false)
    private String department;

    @Column(name = "stipend_amount", nullable = false)
    private String stipendAmount;

    @Column(name = "ctc_amount", nullable = false)
    private String ctcAmount;

    @Column(name = "joining_date", nullable = false)
    private LocalDate joiningDate;

    @Column(name = "offer_date", nullable = false)
    private LocalDate offerDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private OfferStatus status = OfferStatus.CREATED;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by", nullable = false)
    private RecruitmentUser createdBy;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "documents_verified", nullable = false, columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean documentsVerified = false;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
