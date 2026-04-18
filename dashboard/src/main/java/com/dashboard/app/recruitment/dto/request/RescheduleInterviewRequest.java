package com.dashboard.app.recruitment.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class RescheduleInterviewRequest {
    @NotNull(message = "Interview date is required")
    private LocalDate interviewDate;
    
    @NotNull(message = "Interview time is required")
    private LocalTime interviewTime;
}

