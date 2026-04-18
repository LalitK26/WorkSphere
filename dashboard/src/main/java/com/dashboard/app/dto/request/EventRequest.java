package com.dashboard.app.dto.request;

import com.dashboard.app.model.enums.EventStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventRequest {
    
    @NotBlank(message = "Event name is required")
    private String eventName;

    @NotBlank(message = "Location is required")
    private String where;

    private String description;

    @NotNull(message = "Start date is required")
    private LocalDate startsOnDate;

    @NotNull(message = "Start time is required")
    private LocalTime startsOnTime;

    @NotNull(message = "End date is required")
    private LocalDate endsOnDate;

    @NotNull(message = "End time is required")
    private LocalTime endsOnTime;

    @NotNull(message = "Status is required")
    private EventStatus status;

    private String eventLink;

    private List<Long> departmentIds;

    private List<Long> employeeIds;
}
