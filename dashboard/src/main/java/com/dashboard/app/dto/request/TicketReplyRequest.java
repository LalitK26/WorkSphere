package com.dashboard.app.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.List;

@Data
public class TicketReplyRequest {
    private Long ticketId; // Optional, set by controller from path variable if not provided

    @NotBlank(message = "Message is required")
    private String message;

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

