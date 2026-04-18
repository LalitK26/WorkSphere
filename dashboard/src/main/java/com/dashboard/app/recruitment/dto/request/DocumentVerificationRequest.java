package com.dashboard.app.recruitment.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DocumentVerificationRequest {
    @NotBlank(message = "Remark is required for resubmission request")
    private String remark;
}
