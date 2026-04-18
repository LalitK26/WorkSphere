package com.dashboard.app.recruitment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "candidate_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CandidateProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "candidate_id", referencedColumnName = "id", nullable = false)
    private Candidate candidate;

    // Address Information
    private String streetAddress;
    private String city;
    private String state;
    private String zipCode;
    private String country;

    // Experience Information
    private Integer fresherYears;
    private Integer experiencedYears;

    // Documents
    private String resumeUrl;
    private String portfolioUrl;
    private String linkedInUrl;
    private String experienceLetterUrl;

    @OneToMany(mappedBy = "profile", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CandidateEducation> education = new ArrayList<>();

    @Column(nullable = false)
    private boolean isCompleted = false;

    // Aadhaar-verified field flags (read-only fields)
    @Column(nullable = false)
    private Boolean aadhaarVerifiedFirstName = false;

    @Column(nullable = false)
    private Boolean aadhaarVerifiedMiddleName = false;

    @Column(nullable = false)
    private Boolean aadhaarVerifiedLastName = false;

    @Column(nullable = false)
    private Boolean aadhaarVerifiedDateOfBirth = false;

    @Column(nullable = false)
    private Boolean aadhaarVerifiedStreetAddress = false;

    @Column(nullable = false)
    private Boolean aadhaarVerifiedCity = false;

    @Column(nullable = false)
    private Boolean aadhaarVerifiedState = false;

    @Column(nullable = false)
    private Boolean aadhaarVerifiedZipCode = false;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
