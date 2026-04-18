package com.dashboard.app.meeting.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MeetingMessage {
    private String type; // offer, answer, ice-candidate, join, leave
    private String interviewId;
    private String userId;
    private String userName;
    private String role; // CANDIDATE, TECHNICAL_INTERVIEWER, etc.
    private Object data; // SDP offer/answer, ICE candidate, etc.
    private String timestamp;
}
