package com.dashboard.app.recruitment.controller;

import com.dashboard.app.recruitment.dto.request.DocumentVerificationRequest;
import com.dashboard.app.recruitment.dto.response.OfferDocumentResponse;
import com.dashboard.app.recruitment.model.enums.DocumentType;
import com.dashboard.app.recruitment.service.OfferDocumentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/recruitment/offers")
@CrossOrigin(origins = "*")
public class OfferDocumentController {

    @Autowired
    private OfferDocumentService offerDocumentService;

    /**
     * Upload a document for an offer
     * Candidate only - can only upload documents for their own offers
     */
    @PostMapping("/{offerId}/documents/upload")
    public ResponseEntity<OfferDocumentResponse> uploadDocument(
            @PathVariable Long offerId,
            @RequestParam("documentType") DocumentType documentType,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest httpRequest) {
        OfferDocumentResponse response = offerDocumentService.uploadDocument(offerId, documentType, file, httpRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all documents for an offer
     * Candidate can view their own documents, Admin/Recruiter can view all
     */
    @GetMapping("/{offerId}/documents")
    public ResponseEntity<List<OfferDocumentResponse>> getDocumentsByOffer(
            @PathVariable Long offerId,
            HttpServletRequest httpRequest) {
        List<OfferDocumentResponse> documents = offerDocumentService.getDocumentsByOffer(offerId, httpRequest);
        return ResponseEntity.ok(documents);
    }

    /**
     * View/Download a specific document
     * Candidate can view their own documents, Admin/Recruiter can view all
     */
    @GetMapping("/documents/{documentId}/view")
    public ResponseEntity<Resource> viewDocument(
            @PathVariable Long documentId,
            HttpServletRequest httpRequest) {
        Resource resource = offerDocumentService.viewDocument(documentId, httpRequest);
        
        if (resource == null) {
            return ResponseEntity.notFound().build();
        }

        // Determine content type based on file extension
        String contentType = "application/octet-stream";
        String filename = "document";
        try {
            filename = resource.getFilename();
            if (filename != null) {
                String lowerFilename = filename.toLowerCase();
                if (lowerFilename.endsWith(".pdf")) {
                    contentType = "application/pdf";
                } else if (lowerFilename.endsWith(".jpg") || lowerFilename.endsWith(".jpeg")) {
                    contentType = "image/jpeg";
                } else if (lowerFilename.endsWith(".png")) {
                    contentType = "image/png";
                }
            }
        } catch (Exception e) {
            // Use default content type and filename
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .body(resource);
    }

    /**
     * Verify a document
     * Admin/Recruiter only
     */
    @PutMapping("/documents/{documentId}/verify")
    public ResponseEntity<OfferDocumentResponse> verifyDocument(
            @PathVariable Long documentId,
            HttpServletRequest httpRequest) {
        OfferDocumentResponse response = offerDocumentService.verifyDocument(documentId, httpRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Request resubmission of a document
     * Admin/Recruiter only
     */
    @PutMapping("/documents/{documentId}/resubmit")
    public ResponseEntity<OfferDocumentResponse> requestResubmission(
            @PathVariable Long documentId,
            @Valid @RequestBody DocumentVerificationRequest request,
            HttpServletRequest httpRequest) {
        OfferDocumentResponse response = offerDocumentService.requestResubmission(
                documentId, request.getRemark(), httpRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Check if all mandatory documents are verified for an offer
     * Both Candidate and Admin/Recruiter can access
     */
    @GetMapping("/{offerId}/documents/verification-status")
    public ResponseEntity<Boolean> checkDocumentsVerified(
            @PathVariable Long offerId) {
        boolean allVerified = offerDocumentService.checkAllMandatoryDocumentsVerified(offerId);
        return ResponseEntity.ok(allVerified);
    }
}
