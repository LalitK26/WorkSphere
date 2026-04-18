package com.dashboard.app.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "holidays")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Holiday {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String occasion;

    @Column(nullable = false)
    private Boolean isCommon = false; // If true, applies to everyone

    // Store as comma-separated values or use JSON
    @Column(columnDefinition = "TEXT")
    private String departments; // Comma-separated department names

    @Column(columnDefinition = "TEXT")
    private String designations; // Comma-separated designation IDs

    @Column(columnDefinition = "TEXT")
    private String employmentTypes; // Comma-separated employment types

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}

