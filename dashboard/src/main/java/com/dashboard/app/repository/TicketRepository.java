package com.dashboard.app.repository;

import com.dashboard.app.model.Ticket;
import com.dashboard.app.model.enums.TicketStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    Optional<Ticket> findByTicketNumber(String ticketNumber);
    
    List<Ticket> findByRequesterId(Long requesterId);
    
    List<Ticket> findByStatus(TicketStatus status);
    
    List<Ticket> findByRequesterIdAndStatus(Long requesterId, TicketStatus status);
    
    long countByStatus(TicketStatus status);
    
    long countByRequesterId(Long requesterId);
    
    long countByRequesterIdAndStatus(Long requesterId, TicketStatus status);
    
    List<Ticket> findByAssignedAgentId(Long assignedAgentId);
    
    List<Ticket> findByAssignedAgentIdAndStatus(Long assignedAgentId, TicketStatus status);
    
    void deleteByRequesterId(Long requesterId);
    
    @Query("SELECT MAX(t.ticketNumber) FROM Ticket t WHERE t.ticketNumber LIKE 'TKT-%'")
    Optional<String> findMaxTicketNumber();
}

