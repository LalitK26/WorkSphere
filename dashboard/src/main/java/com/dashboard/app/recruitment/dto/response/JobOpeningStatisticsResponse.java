package com.dashboard.app.recruitment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobOpeningStatisticsResponse {
    private Long activeOpenings;
    private Long totalOpenings;
    private Long onHold;
    private Long closedThisMonth;
}
