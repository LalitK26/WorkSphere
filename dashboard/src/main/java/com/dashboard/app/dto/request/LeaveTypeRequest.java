package com.dashboard.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class LeaveTypeRequest {
    @NotBlank(message = "Leave type name is required")
    private String name;

    @NotBlank(message = "Allotment type is required")
    private String allotmentType; // 'MONTHLY' or 'YEARLY'

    @NotNull(message = "Number of leaves is required")
    private Double noOfLeaves;

    @NotBlank(message = "Paid status is required")
    private String paidStatus; // 'PAID' or 'UNPAID'

    private Integer effectiveAfterValue = 0;
    private String effectiveAfterUnit = "DAYS"; // 'DAYS' or 'MONTHS'
    private String unusedLeavesAction = "CARRY_FORWARD"; // 'CARRY_FORWARD', 'LAPSE', 'PAID'
    private String overUtilizationAction = "DO_NOT_ALLOW"; // 'DO_NOT_ALLOW', 'ALLOW_PAID', 'ALLOW_UNPAID'
    private Boolean allowedInProbation = false;
    private Boolean allowedInNoticePeriod = false;
    private List<String> genders; // ['Male', 'Female', 'Others']
    private List<String> maritalStatuses; // ['Single', 'Married', 'Widower', 'Widow', 'Separate', 'Divorced']
    private List<String> departments; // Department names
    private List<Long> designations; // Designation IDs
}

