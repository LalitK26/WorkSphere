package com.dashboard.app.recruitment.dto.request;

import com.dashboard.app.recruitment.model.enums.InterviewResult;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SubmitResultRequest {
    @NotNull(message = "Result is required")
    private InterviewResult result;

    private String remarks;

    private Long assignedRecruiterId;
}
