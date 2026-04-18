package com.dashboard.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class TicketRequest {
    @NotBlank(message = "Subject is required")
    private String subject;

    @NotBlank(message = "Description is required")
    private String description;

    private String status; // OPEN, PENDING, RESOLVED, CLOSED

    private String priority; // LOW, MEDIUM, HIGH

    @NotNull(message = "Requester ID is required")
    private Long requesterId;

    private Long assignedAgentId;

    private String assignGroup;

    private Long projectId;

    private String ticketType;

    private String channelName;

    private String tags;

    private String requesterEmail;

    private String requesterType; // CLIENT or EMPLOYEE

    // For file uploads
    private List<FileData> files;

    @Data
    public static class FileData {
        private String fileName;
        private String fileContent; // Base64 encoded
        private Long fileSize;
        private String contentType;
    }
}

