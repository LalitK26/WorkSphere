package com.dashboard.app.recruitment.dto.response;

import com.dashboard.app.recruitment.model.enums.DocumentType;
import com.dashboard.app.recruitment.model.enums.DocumentVerificationStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OfferDocumentResponse {
    private Long id;
    private Long offerLetterId;
    private DocumentType documentType;
    private String documentTypeName;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private DocumentVerificationStatus verificationStatus;
    private String verificationStatusName;
    private String remark;
    private LocalDateTime uploadedAt;
    private LocalDateTime verifiedAt;
    private String verifiedByName;
    private boolean mandatory;
}
