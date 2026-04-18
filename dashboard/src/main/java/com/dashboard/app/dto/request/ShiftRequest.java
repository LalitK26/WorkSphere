package com.dashboard.app.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ShiftRequest {
    @NotBlank(message = "Shift name is required")
    private String name;

    @NotBlank(message = "Start time is required")
    private String startTime; // HH:mm

    @NotBlank(message = "End time is required")
    private String endTime; // HH:mm

    @NotNull(message = "Grace minutes is required")
    @Min(value = 0, message = "Grace minutes must be at least 0")
    @Max(value = 30, message = "Grace minutes cannot exceed 30")
    private Integer graceMinutes;
}


