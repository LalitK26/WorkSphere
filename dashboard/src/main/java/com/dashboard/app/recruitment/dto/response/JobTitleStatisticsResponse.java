package com.dashboard.app.recruitment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class JobTitleStatisticsResponse {
    private String jobTitle;
    private Long applicationCount;
}

