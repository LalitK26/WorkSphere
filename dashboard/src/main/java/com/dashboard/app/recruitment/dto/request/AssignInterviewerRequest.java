package com.dashboard.app.recruitment.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class AssignInterviewerRequest {
    @NotNull(message = "Interviewer ID is required")
    private Long interviewerId;
    
    @NotNull(message = "At least one candidate application ID is required")
    private List<Long> candidateApplicationIds;
}

