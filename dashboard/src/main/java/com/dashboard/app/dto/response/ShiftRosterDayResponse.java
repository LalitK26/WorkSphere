package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShiftRosterDayResponse {
    private LocalDate date;
    private boolean holiday;
    private boolean sunday;
    private Long assignmentId;
    private ShiftResponse shift;
}


