package com.dashboard.app.meeting.service;

import com.dashboard.app.meeting.dto.MeetingMessage;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class MeetingSignalingService {

    private final SimpMessagingTemplate messagingTemplate;
    
    // Track active participants in each meeting
    private final ConcurrentMap<String, ConcurrentMap<String, MeetingMessage>> activeMeetings = new ConcurrentHashMap<>();
    
    // Track participants waiting for a host
    private final ConcurrentMap<String, Set<String>> waitingCandidates = new ConcurrentHashMap<>();

    private static final List<String> HOST_ROLES = Arrays.asList(
            "TECHNICAL_INTERVIEWER", 
            "HR_RECRUITER", 
            "RECRUITER", 
            "RECRUITMENT_ADMIN"
    );

    public MeetingSignalingService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void handleMeetingMessage(MeetingMessage message) {
        String interviewId = message.getInterviewId();
        String userId = message.getUserId();

        switch (message.getType()) {
            case "join":
                handleJoin(interviewId, userId, message);
                break;
            case "leave":
                handleLeave(interviewId, userId);
                break;
            case "offer":
            case "answer":
            case "ice-candidate":
            case "media-state-update":
            case "screen-share-start":
            case "screen-share-stop":
                // Forward the message to other participants in the meeting
                broadcastToOtherParticipants(interviewId, userId, message);
                break;
        }
    }

    private void handleJoin(String interviewId, String userId, MeetingMessage message) {
        String role = message.getRole();
        boolean isHost = HOST_ROLES.contains(role);
        
        // Check if a host is present in the meeting
        boolean hostPresent = isHostPresent(interviewId);
        
        // If it's a candidate and no host is present, block entry
        if (!isHost && !hostPresent) {
            // Add to waiting list
            waitingCandidates.computeIfAbsent(interviewId, k -> ConcurrentHashMap.newKeySet()).add(userId);
            
            // Send "host not present" error/status to the candidate
            MeetingMessage errorMsg = new MeetingMessage();
            errorMsg.setType("error");
            errorMsg.setInterviewId(interviewId);
            errorMsg.setUserId(userId);
            errorMsg.setRole("SYSTEM");
            errorMsg.setData("HOST_NOT_PRESENT");
            errorMsg.setTimestamp(LocalDateTime.now().toString());
            
            messagingTemplate.convertAndSend("/queue/meeting/" + interviewId + "/" + userId, errorMsg);
            return;
        }

        // Add participant to the meeting
        activeMeetings.computeIfAbsent(interviewId, k -> new ConcurrentHashMap<>())
                .put(userId, message);

        // Notify other participants about the new joiner
        MeetingMessage joinNotification = new MeetingMessage();
        joinNotification.setType("participant-joined");
        joinNotification.setInterviewId(interviewId);
        joinNotification.setUserId(userId);
        joinNotification.setUserName(message.getUserName());
        joinNotification.setRole(message.getRole());
        joinNotification.setTimestamp(LocalDateTime.now().toString());

        broadcastToOtherParticipants(interviewId, userId, joinNotification);

        // Send list of existing participants to the new joiner
        sendExistingParticipants(interviewId, userId);
        
        // If a host just joined, notify waiting candidates
        if (isHost) {
            notifyWaitingCandidates(interviewId);
        }
    }

    private boolean isHostPresent(String interviewId) {
        ConcurrentMap<String, MeetingMessage> participants = activeMeetings.get(interviewId);
        if (participants == null || participants.isEmpty()) {
            return false;
        }
        
        return participants.values().stream()
                .anyMatch(p -> HOST_ROLES.contains(p.getRole()));
    }
    
    private void notifyWaitingCandidates(String interviewId) {
        Set<String> waiting = waitingCandidates.get(interviewId);
        if (waiting != null && !waiting.isEmpty()) {
            MeetingMessage hostJoinedMsg = new MeetingMessage();
            hostJoinedMsg.setType("host-joined");
            hostJoinedMsg.setInterviewId(interviewId);
            hostJoinedMsg.setTimestamp(LocalDateTime.now().toString());
            
            for (String waitingUserId : waiting) {
                messagingTemplate.convertAndSend("/queue/meeting/" + interviewId + "/" + waitingUserId, hostJoinedMsg);
            }
            
            // Clear waiting list as they have been notified and will retry joining
            waitingCandidates.remove(interviewId);
        }
    }

    private void handleLeave(String interviewId, String userId) {
        ConcurrentMap<String, MeetingMessage> participants = activeMeetings.get(interviewId);
        if (participants != null) {
            participants.remove(userId);
            
            // Notify other participants about the leave
            MeetingMessage leaveNotification = new MeetingMessage();
            leaveNotification.setType("participant-left");
            leaveNotification.setInterviewId(interviewId);
            leaveNotification.setUserId(userId);
            leaveNotification.setTimestamp(LocalDateTime.now().toString());

            broadcastToOtherParticipants(interviewId, userId, leaveNotification);

            // Clean up empty meetings
            if (participants.isEmpty()) {
                activeMeetings.remove(interviewId);
                // Also clear waiting candidates if any (though they should have been notified or given up)
                waitingCandidates.remove(interviewId);
            }
        } 
        
        // Also remove from waiting list if they were there (handle case where waiting candidate leaves)
        Set<String> waiting = waitingCandidates.get(interviewId);
        if (waiting != null) {
            waiting.remove(userId);
            if (waiting.isEmpty()) {
                waitingCandidates.remove(interviewId);
            }
        }
    }

    private void broadcastToOtherParticipants(String interviewId, String senderId, MeetingMessage message) {
        ConcurrentMap<String, MeetingMessage> participants = activeMeetings.get(interviewId);
        if (participants != null) {
            participants.forEach((userId, participant) -> {
                if (!userId.equals(senderId)) {
                    // Send to specific user
                    messagingTemplate.convertAndSend("/queue/meeting/" + interviewId + "/" + userId, message);
                }
            });
        }
    }

    private void sendExistingParticipants(String interviewId, String newUserId) {
        ConcurrentMap<String, MeetingMessage> participants = activeMeetings.get(interviewId);
        if (participants != null) {
            participants.forEach((userId, participant) -> {
                if (!userId.equals(newUserId)) {
                    // Send existing participant info to new user
                    MeetingMessage existingParticipant = new MeetingMessage();
                    existingParticipant.setType("existing-participant");
                    existingParticipant.setInterviewId(interviewId);
                    existingParticipant.setUserId(userId);
                    existingParticipant.setUserName(participant.getUserName());
                    existingParticipant.setRole(participant.getRole());
                    existingParticipant.setTimestamp(LocalDateTime.now().toString());

                    messagingTemplate.convertAndSend("/queue/meeting/" + interviewId + "/" + newUserId, existingParticipant);
                }
            });
        }
    }

    /**
     * Check if an interviewer (host) is currently present in the meeting.
     * This is used by candidates to determine if they can join the interview.
     * 
     * @param interviewId The interview ID to check
     * @return true if at least one interviewer is present, false otherwise
     */
    public boolean isInterviewerPresent(String interviewId) {
        return isHostPresent(interviewId);
    }
}
