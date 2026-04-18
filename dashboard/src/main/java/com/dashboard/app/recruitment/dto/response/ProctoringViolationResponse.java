package com.dashboard.app.recruitment.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ProctoringViolationResponse {
    private Long id;
    private Long interviewId;
    private String violationType;
    private String description;
    private LocalDateTime timestamp;
    private LocalDateTime createdAt;
}
