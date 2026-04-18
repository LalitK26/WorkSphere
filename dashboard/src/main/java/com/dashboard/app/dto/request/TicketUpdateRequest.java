package com.dashboard.app.dto.request;

import lombok.Data;

@Data
public class TicketUpdateRequest {
    private String subject;
    private String description;
    private String status; // OPEN, PENDING, RESOLVED, CLOSED
    private String priority; // LOW, MEDIUM, HIGH
    private Long assignedAgentId;
    private String assignGroup;
    private Long projectId;
    private String ticketType;
    private String channelName;
    private String tags;
}




