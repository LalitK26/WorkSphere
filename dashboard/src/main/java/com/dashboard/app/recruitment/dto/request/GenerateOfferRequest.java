package com.dashboard.app.recruitment.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GenerateOfferRequest {
    
    @NotNull(message = "Candidate ID is required")
    private Long candidateId;
    
    @NotNull(message = "Job Opening ID is required")
    private Long jobOpeningId;
    
    @NotBlank(message = "Position is required")
    private String position;
    
    @NotBlank(message = "Department is required")
    private String department;
    
    @NotBlank(message = "Stipend amount is required")
    private String stipendAmount;
    
    @NotBlank(message = "CTC amount is required")
    private String ctcAmount;
    
    @NotNull(message = "Joining date is required")
    private LocalDate joiningDate;
    
    private LocalDate offerDate; // Optional, defaults to today
}
