package com.dashboard.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class LeaveRequest {
    @NotNull(message = "User ID is required")
    private Long userId;

    @NotNull(message = "Leave type ID is required")
    private Long leaveTypeId;

    @NotBlank(message = "Start date is required")
    private String startDate; // ISO date string (yyyy-MM-dd)

    @NotBlank(message = "End date is required")
    private String endDate; // ISO date string

    @NotBlank(message = "Duration type is required")
    private String durationType; // 'FULL_DAY', 'MULTIPLE', 'FIRST_HALF', 'SECOND_HALF'

    private String status = "PENDING"; // 'PENDING', 'APPROVED', 'REJECTED'
    private String reason;
    private String fileUrl;
}

