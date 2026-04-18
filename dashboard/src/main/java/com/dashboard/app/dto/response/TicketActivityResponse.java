package com.dashboard.app.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TicketActivityResponse {
    private Long id;
    private String action;
    private Long userId;
    private String userName;
    private LocalDateTime createdAt;
}

