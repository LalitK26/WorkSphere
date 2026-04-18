package com.dashboard.app.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "module_permissions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"role_id", "module"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModulePermission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Column(nullable = false)
    private String module; // Employees, Projects, Tasks, etc.

    @Column(name = "`add`", nullable = false)
    private String add; // All, None

    @Column(name = "`view`", nullable = false)
    private String view; // All, Added, Owned, Added & Owned, None

    @Column(name = "`update`", nullable = false)
    private String update; // All, Added, Owned, Added & Owned, None

    @Column(name = "`delete`", nullable = false)
    private String delete; // All, Added, None

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}

