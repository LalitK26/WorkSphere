package com.dashboard.app.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "ticket_files")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TicketFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reply_id")
    private TicketReply reply; // null if attached to ticket, not reply

    @Column(nullable = false)
    private String fileName;

    @Column(name = "file_content", nullable = true)
    private String fileContent = ""; // Legacy field - kept for database compatibility, set to empty string

    @Column(name = "file_path", nullable = false, length = 1000)
    private String filePath; // File path stored here

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "content_type")
    private String contentType;

    @CreationTimestamp
    private LocalDateTime createdAt;
}

