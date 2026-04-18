package com.dashboard.app.recruitment.controller;

import com.dashboard.app.recruitment.dto.request.GenerateOfferRequest;
import com.dashboard.app.recruitment.dto.response.OfferLetterResponse;
import com.dashboard.app.recruitment.service.OfferLetterService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recruitment/offers")
@CrossOrigin(origins = "*")
public class OfferLetterController {

    @Autowired
    private OfferLetterService offerLetterService;

    /**
     * Generate a new offer letter
     * Admin/Recruiter only
     */
    @PostMapping("/generate")
    public ResponseEntity<OfferLetterResponse> generateOffer(
            @Valid @RequestBody GenerateOfferRequest request,
            HttpServletRequest httpRequest) {
        OfferLetterResponse response = offerLetterService.generateOffer(request, httpRequest);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Get offer letter by ID
     * Admin/Recruiter can view all, Candidate can view only their own
     */
    @GetMapping("/{id}")
    public ResponseEntity<OfferLetterResponse> getOfferById(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        OfferLetterResponse response = offerLetterService.getOfferById(id, httpRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all offers for a specific candidate
     * Admin/Recruiter only
     */
    @GetMapping("/candidate/{candidateId}")
    public ResponseEntity<List<OfferLetterResponse>> getOffersByCandidate(
            @PathVariable Long candidateId,
            HttpServletRequest httpRequest) {
        List<OfferLetterResponse> offers = offerLetterService.getOffersByCandidate(candidateId, httpRequest);
        return ResponseEntity.ok(offers);
    }

    /**
     * Download offer letter as PDF
     * Admin/Recruiter can download all, Candidate can download only their own
     */
    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> downloadOfferPdf(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        byte[] pdfBytes = offerLetterService.downloadOfferPdf(id, httpRequest);

        if (pdfBytes == null || pdfBytes.length == 0) {
            throw new RuntimeException("Failed to generate PDF: PDF bytes are empty");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "offer-letter-" + id + ".pdf");
        headers.setContentLength(pdfBytes.length);

        return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
    }

    /**
     * Send offer to candidate
     * Admin/Recruiter only
     * Changes status from CREATED to SENT
     */
    @PutMapping("/{id}/send")
    public ResponseEntity<OfferLetterResponse> sendOffer(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        OfferLetterResponse response = offerLetterService.sendOffer(id, httpRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Accept offer
     * Candidate only
     * Changes status from SENT to ACCEPTED
     */
    @PutMapping("/{id}/accept")
    public ResponseEntity<OfferLetterResponse> acceptOffer(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        OfferLetterResponse response = offerLetterService.acceptOffer(id, httpRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Reject offer
     * Candidate only
     * Changes status from SENT to REJECTED
     */
    @PutMapping("/{id}/reject")
    public ResponseEntity<OfferLetterResponse> rejectOffer(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        OfferLetterResponse response = offerLetterService.rejectOffer(id, httpRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all offers for current candidate
     * Candidate only
     */
    @GetMapping("/my-offers")
    public ResponseEntity<List<OfferLetterResponse>> getMyOffers(HttpServletRequest httpRequest) {
        List<OfferLetterResponse> offers = offerLetterService.getMyOffers(httpRequest);
        return ResponseEntity.ok(offers);
    }

    /**
     * Get all offers in the system
     * Admin/Recruiter only - for dashboard statistics
     */
    @GetMapping("/all")
    public ResponseEntity<org.springframework.data.domain.Page<OfferLetterResponse>> getAllOffers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            HttpServletRequest httpRequest) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<OfferLetterResponse> offers = offerLetterService.getAllOffers(pageable,
                httpRequest);
        return ResponseEntity.ok(offers);
    }
}
