package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HolidayResponse {
    private Long id;
    private LocalDate date;
    private String occasion;
    private Boolean isCommon;
    private List<String> departments;
    private List<Long> designations;
    private List<String> employmentTypes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

