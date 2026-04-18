package com.dashboard.app.dto;

import com.dashboard.app.dto.response.DepartmentResponse;
import com.dashboard.app.dto.response.EmployeeResponse;
import com.dashboard.app.model.enums.EventStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventDto {
    private Long id;
    private String eventName;
    private String where;
    private String description;
    private LocalDate startsOnDate;
    private LocalTime startsOnTime;
    private LocalDate endsOnDate;
    private LocalTime endsOnTime;
    private EventStatus status;
    private String eventLink;
    private List<DepartmentResponse> departments;
    private List<EmployeeResponse> employees;
    private String createdByName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
