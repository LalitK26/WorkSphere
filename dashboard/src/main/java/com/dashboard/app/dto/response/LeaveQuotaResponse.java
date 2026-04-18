package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveQuotaResponse {
    private Long leaveTypeId;
    private String leaveTypeName;
    private Double noOfLeaves; // Total allotted
    private Double monthlyLimit; // For monthly leave types
    private Double totalLeavesTaken;
    private Double remainingLeaves;
    private Double overUtilized;
    private Double unusedLeaves;
}

