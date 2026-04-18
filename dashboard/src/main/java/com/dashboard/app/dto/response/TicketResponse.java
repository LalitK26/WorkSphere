package com.dashboard.app.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class TicketResponse {
    private Long id;
    private String ticketNumber;
    private String subject;
    private String description;
    private String status;
    private String priority;
    private Long requesterId;
    private String requesterName;
    private String requesterEmail;
    private String requesterDesignation;
    private String requesterProfilePicture;
    private Long assignedAgentId;
    private String assignedAgentName;
    private String assignGroup;
    private Long projectId;
    private String projectName;
    private String ticketType;
    private String channelName;
    private String tags;
    private String requesterType;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<TicketActivityResponse> activities;
    private List<TicketReplyResponse> replies;
    private List<TicketFileResponse> files;
}

