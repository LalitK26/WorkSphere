package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShiftResponse {
    private Long id;
    private String name;
    private String startTime;
    private String endTime;
    private Integer graceMinutes;
    private String label;
}


