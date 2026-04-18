package com.dashboard.app.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TicketFileResponse {
    private Long id;
    private String fileName;
    private String fileContent; // Base64 encoded
    private Long fileSize;
    private String contentType;
    private LocalDateTime createdAt;
}

