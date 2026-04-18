package com.dashboard.app.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class BulkShiftAssignmentRequest {
    @NotNull(message = "Shift is required")
    private Long shiftId;

    @NotEmpty(message = "Employees are required")
    private List<Long> employeeIds;

    /**
     * Allowed values: DATE, MULTIPLE, MONTH
     */
    @NotNull(message = "Assign type is required")
    private String assignType;

    // Used when assignType = DATE
    private String date;

    // Used when assignType = MULTIPLE
    private List<String> dates; // legacy support, optional
    private String rangeStart;
    private String rangeEnd;

    // Used when assignType = MONTH
    private Integer month; // 1-12
    private Integer year;

    private Boolean sendEmail = Boolean.FALSE;

    private String remark;

    private String fileName;

    /**
     * Base64 encoded content
     */
    private String fileContent;
}


