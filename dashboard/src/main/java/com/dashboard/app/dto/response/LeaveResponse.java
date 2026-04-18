package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LeaveResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String userFullName;
    private Long leaveTypeId;
    private String leaveTypeName;
    private LocalDate startDate;
    private LocalDate endDate;
    private String durationType;
    private String status;
    private String reason;
    private String fileUrl;
    private String paidStatus;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

