package com.dashboard.app.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "project_files")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    private User uploadedBy;

    @Column(nullable = false)
    private String originalFileName;

    // Temporary field for migration - allows NULL values to be inserted
    // This field will be removed after migration is complete
    @Column(name = "stored_file_name", nullable = true, insertable = true, updatable = false)
    private String storedFileName; // Deprecated - not used, only for schema migration

    @Column(nullable = false, length = 1000)
    private String cloudinaryUrl; // Cloudinary URL instead of local file path

    @Column(nullable = false)
    private String contentType;

    @Column(nullable = false)
    private Long sizeInBytes;

    @CreationTimestamp
    private LocalDateTime uploadedAt;
}

