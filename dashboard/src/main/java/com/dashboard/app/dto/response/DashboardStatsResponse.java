package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse {
    private Long totalClients;
    private Long totalEmployees;
    private Long totalProjects;
    private Long dueInvoices;
    private String hoursLogged;
    private Long pendingTasks;
    private String todayAttendance; // e.g., "12/272"
    private Long unresolvedTickets;
}

