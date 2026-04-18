package com.dashboard.app.recruitment.model;

import com.dashboard.app.recruitment.model.enums.JobStatus;
import com.dashboard.app.recruitment.model.enums.JobType;
import com.dashboard.app.recruitment.model.enums.WorkMode;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "job_openings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobOpening {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String jobTitle;

    @Column(nullable = false)
    private String jobName;

    @Column(nullable = false)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private JobType jobType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private WorkMode workMode;

    @Column(nullable = false)
    private String department;

    @Column(name = "application_date", nullable = false)
    private LocalDate applicationDate;

    @Column(name = "expected_joining_date")
    private LocalDate expectedJoiningDate;

    @Column(name = "number_of_openings", nullable = false)
    private Integer numberOfOpenings = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private JobStatus status = JobStatus.ACTIVE;

    @Column(name = "posted_date")
    private LocalDate postedDate;

    @Column(name = "min_experience_years")
    private Integer minExperienceYears = 0;

    @Column(name = "required_skills", columnDefinition = "TEXT")
    private String requiredSkills;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "created_by", nullable = false)
    private RecruitmentUser createdBy;

    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;
}
