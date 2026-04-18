package com.dashboard.app.meeting.controller;

import com.dashboard.app.meeting.dto.MeetingMessage;
import com.dashboard.app.meeting.service.MeetingSignalingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class MeetingSignalingController {

    @Autowired
    private MeetingSignalingService meetingSignalingService;

    @MessageMapping("/meeting/signal")
    @SendTo("/topic/meeting")
    public MeetingMessage handleMeetingSignal(@Payload MeetingMessage message) {
        // Process the message and forward to appropriate participants
        meetingSignalingService.handleMeetingMessage(message);
        return message;
    }
}
