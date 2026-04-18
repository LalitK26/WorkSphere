package com.dashboard.app.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ShiftUpdateRequest {
    @NotNull(message = "User is required")
    private Long userId;

    @NotNull(message = "Shift date is required")
    private String date; // ISO yyyy-MM-dd

    @NotNull(message = "Shift is required")
    private Long shiftId;

    private String remark;
    private Boolean sendEmail = Boolean.FALSE;
    private String fileName;
    private String fileContent;
}


