package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShiftRosterResponse {
    private int year;
    private int month;
    private List<ShiftRosterEmployeeResponse> employees;
    private long totalElements;
    private int totalPages;
    private int currentPage;
    private int pageSize;
}


