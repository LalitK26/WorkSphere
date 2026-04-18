package com.dashboard.app.controller;

import com.dashboard.app.dto.request.TicketReplyRequest;
import com.dashboard.app.dto.request.TicketRequest;
import com.dashboard.app.dto.request.TicketUpdateRequest;
import com.dashboard.app.dto.response.TicketReplyResponse;
import com.dashboard.app.dto.response.TicketResponse;
import com.dashboard.app.dto.response.TicketSummaryResponse;
import com.dashboard.app.service.TicketService;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    @Autowired
    private TicketService ticketService;

    @Autowired
    private JwtUtil jwtUtil;

    private Long getCurrentUserId(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            return jwtUtil.extractUserId(token);
        }
        return null;
    }

    @PostMapping
    public ResponseEntity<TicketResponse> createTicket(@Valid @RequestBody TicketRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        TicketResponse response = ticketService.createTicket(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TicketResponse> updateTicket(@PathVariable Long id, @RequestBody TicketUpdateRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        TicketResponse response = ticketService.updateTicket(id, request, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketResponse> getTicketById(@PathVariable Long id, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        TicketResponse response = ticketService.getTicketById(id, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<TicketResponse>> getAllTickets(
            @RequestParam(required = false) String status,
            HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        List<TicketResponse> responses;
        if (status != null && !status.isEmpty()) {
            responses = ticketService.getTicketsByStatus(status, userId);
        } else {
            responses = ticketService.getAllTickets(userId);
        }
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/summary")
    public ResponseEntity<TicketSummaryResponse> getTicketSummary(HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        TicketSummaryResponse response = ticketService.getTicketSummary(userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/reply")
    public ResponseEntity<TicketReplyResponse> addReply(@PathVariable Long id, @Valid @RequestBody TicketReplyRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        if (request.getTicketId() == null) {
            request.setTicketId(id);
        }
        TicketReplyResponse response = ticketService.addReply(request, userId, id);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTicket(@PathVariable Long id, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        ticketService.deleteTicket(id, userId);
        return ResponseEntity.noContent().build();
    }
}

