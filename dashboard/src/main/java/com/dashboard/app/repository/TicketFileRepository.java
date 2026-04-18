package com.dashboard.app.repository;

import com.dashboard.app.model.TicketFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketFileRepository extends JpaRepository<TicketFile, Long> {
    List<TicketFile> findByTicketId(Long ticketId);
    
    List<TicketFile> findByReplyId(Long replyId);
}

