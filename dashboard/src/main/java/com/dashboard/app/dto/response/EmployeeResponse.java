package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeResponse {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String fullName;
    private String employeeId;
    private Long roleId;
    private String roleName;
    private Long designationId;
    private String designationName;
    private Long reportingManagerId;
    private String reportingManagerName;
    private String status;
    private LocalDateTime createdAt;

    // Extended profile fields
    private String department;
    private String country;
    private String mobile;
    private String gender;
    private LocalDate joiningDate;
    private LocalDate dateOfBirth;
    private String language;
    private String address;
    private String about;
    private Boolean loginAllowed;
    private Boolean receiveEmailNotifications;
    private BigDecimal hourlyRate;
    private String slackMemberId;
    private String skills;
    private LocalDate probationEndDate;
    private LocalDate noticePeriodStartDate;
    private LocalDate noticePeriodEndDate;
    private String employmentType;
    private String maritalStatus;
    private LocalDate internshipEndDate;
    private String businessAddress;
    private LocalDate exitDate;
    private String profilePictureUrl;
}

