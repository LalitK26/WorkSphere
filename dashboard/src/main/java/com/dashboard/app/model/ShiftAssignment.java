package com.dashboard.app.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "shift_assignments", uniqueConstraints = {
        @UniqueConstraint(name = "uk_shift_assignment_user_date", columnNames = {"user_id", "shift_date"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShiftAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "shift_id")
    private Shift shift;

    @Column(name = "shift_date", nullable = false)
    private LocalDate shiftDate;

    @Column(columnDefinition = "TEXT")
    private String remark;

    private Boolean sendEmail = Boolean.FALSE;

    private String attachmentName;

    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String attachmentData;

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}


