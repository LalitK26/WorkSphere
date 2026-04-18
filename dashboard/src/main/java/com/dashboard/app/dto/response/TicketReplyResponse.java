package com.dashboard.app.dto.response;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class TicketReplyResponse {
    private Long id;
    private String message;
    private Long userId;
    private String userName;
    private String userProfilePicture;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<TicketFileResponse> files;
}

