package com.dashboard.app.recruitment.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "employee_id_sequence")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeIdSequence {
    
    @Id
    @Column(name = "id")
    private Integer id = 1; // Always 1 (singleton pattern)
    
    @Column(name = "current_value", nullable = false)
    private Integer currentValue = 0;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
