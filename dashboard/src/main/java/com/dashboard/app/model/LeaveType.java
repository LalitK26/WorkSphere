package com.dashboard.app.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "leave_types")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String allotmentType; // 'MONTHLY' or 'YEARLY'

    @Column(nullable = false)
    private Double noOfLeaves = 0.0;

    @Column(nullable = false)
    private String paidStatus; // 'PAID' or 'UNPAID'

    @Column(nullable = false)
    private Integer effectiveAfterValue = 0;

    @Column(nullable = false)
    private String effectiveAfterUnit = "DAYS"; // 'DAYS' or 'MONTHS'

    @Column(nullable = false)
    private String unusedLeavesAction = "CARRY_FORWARD"; // 'CARRY_FORWARD', 'LAPSE', 'PAID'

    @Column(nullable = false)
    private String overUtilizationAction = "DO_NOT_ALLOW"; // 'DO_NOT_ALLOW', 'ALLOW_PAID', 'ALLOW_UNPAID'

    @Column(nullable = false)
    private Boolean allowedInProbation = false;

    @Column(nullable = false)
    private Boolean allowedInNoticePeriod = false;

    @Column(columnDefinition = "TEXT")
    private String genders; // Comma-separated: 'Male', 'Female', 'Others'

    @Column(columnDefinition = "TEXT")
    private String maritalStatuses; // Comma-separated: 'Single', 'Married', 'Widower', 'Widow', 'Separate', 'Divorced'

    @Column(columnDefinition = "TEXT")
    private String departments; // Comma-separated department names

    @Column(columnDefinition = "TEXT")
    private String designations; // Comma-separated designation IDs

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}

