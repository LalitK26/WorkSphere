package com.dashboard.app.recruitment.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
public class ScheduleInterviewRequest {
    @NotNull(message = "At least one interview assignment ID is required")
    private List<Long> interviewAssignmentIds;
    
    @NotNull(message = "Interview date is required")
    private LocalDate interviewDate;
    
    @NotNull(message = "Interview time is required")
    private LocalTime interviewTime;
    
    private String notes;
}

