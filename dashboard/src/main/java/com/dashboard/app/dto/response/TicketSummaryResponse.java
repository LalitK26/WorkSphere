package com.dashboard.app.dto.response;

import lombok.Data;

@Data
public class TicketSummaryResponse {
    private long totalTickets;
    private long closedTickets;
    private long openTickets;
    private long pendingTickets;
    private long resolvedTickets;
}

