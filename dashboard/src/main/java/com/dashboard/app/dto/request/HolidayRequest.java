package com.dashboard.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class HolidayRequest {
    @NotNull(message = "Date is required")
    private LocalDate date;

    @NotBlank(message = "Occasion is required")
    private String occasion;

    private Boolean isCommon = false;

    private List<String> departments; // List of department names

    private List<Long> designations; // List of designation IDs

    private List<String> employmentTypes; // List of employment types (e.g., "Full-time", "Part-time", etc.)
}

