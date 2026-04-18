package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShiftAssignmentResponse {
    private Long id;
    private Long userId;
    private String employeeName;
    private LocalDate shiftDate;
    private ShiftResponse shift;
    private String remark;
    private Boolean hasAttachment;
}


