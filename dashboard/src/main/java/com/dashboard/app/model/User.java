package com.dashboard.app.model;

import com.dashboard.app.model.enums.UserStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private String employeeId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "designation_id")
    private Designation designation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporting_manager_id")
    private User reportingManager;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private UserStatus status = UserStatus.ACTIVE;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "assignedTo", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<Task> assignedTasks = new HashSet<>();

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Set<Attendance> attendances = new HashSet<>();

    @ManyToMany(mappedBy = "members", fetch = FetchType.LAZY)
    private Set<Project> projects = new HashSet<>();

    public String getFullName() {
        return firstName + " " + lastName;
    }

    // --- Extended employee profile fields to support detailed HR screens ---

    private String department;

    private String country;

    private String mobile;

    private String gender;

    private LocalDate joiningDate;

    private LocalDate dateOfBirth;

    private String language;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(columnDefinition = "TEXT")
    private String about;

    private Boolean loginAllowed = true;

    private Boolean receiveEmailNotifications = true;

    private BigDecimal hourlyRate;

    private String slackMemberId;

    @Column(columnDefinition = "TEXT")
    private String skills;

    private LocalDate probationEndDate;

    private LocalDate noticePeriodStartDate;

    private LocalDate noticePeriodEndDate;

    private String employmentType;

    private String maritalStatus;

    private LocalDate internshipEndDate;

    private String businessAddress;

    private LocalDate exitDate;

    /**
     * Stores file path for the profile picture (e.g., "uploads/profile-images/filename.jpg")
     * The path is converted to an API URL when returned to the frontend.
     */
    @Column(length = 500)
    private String profilePictureUrl;
}

