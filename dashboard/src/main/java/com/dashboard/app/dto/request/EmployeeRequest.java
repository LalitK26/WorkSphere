package com.dashboard.app.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class EmployeeRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    private String password;
    private String employeeId;
    private Long roleId;
    private Long designationId;
    private Long reportingManagerId;

    // Extended details
    private String department;
    private String country;
    private String mobile;
    private String gender;
    private String joiningDate; // ISO date string (yyyy-MM-dd)
    private String dateOfBirth; // ISO date string
    private String language;
    private String address;
    private String about;
    private Boolean loginAllowed;
    private Boolean receiveEmailNotifications;
    private BigDecimal hourlyRate;
    private String slackMemberId;
    private String skills;
    private String probationEndDate;
    private String noticePeriodStartDate;
    private String noticePeriodEndDate;
    private String employmentType;
    private String maritalStatus;
    private String internshipEndDate;
    private String businessAddress;
    private String exitDate;
    private String status; // ACTIVE / INACTIVE / SUSPENDED
    private String profilePictureUrl;
}

