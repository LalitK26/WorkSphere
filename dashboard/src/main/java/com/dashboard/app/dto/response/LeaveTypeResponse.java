package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveTypeResponse {
    private Long id;
    private String name;
    private String allotmentType;
    private Double noOfLeaves;
    private String paidStatus;
    private Integer effectiveAfterValue;
    private String effectiveAfterUnit;
    private String unusedLeavesAction;
    private String overUtilizationAction;
    private Boolean allowedInProbation;
    private Boolean allowedInNoticePeriod;
    private List<String> genders;
    private List<String> maritalStatuses;
    private List<String> departments;
    private List<Long> designations;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

