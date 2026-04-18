package com.dashboard.app.controller;

import com.dashboard.app.exception.ForbiddenException;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.model.User;
import com.dashboard.app.model.enums.RoleType;
import com.dashboard.app.repository.UserRepository;
import com.dashboard.app.service.IdCardService;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller for the virtual employee ID card.
 * Employees: view/download own ID card only.
 * Admins: download ID cards from Employees page (single or bulk).
 * 
 * FIX: Ensuring precise mapping for /api/id-card/pdf to avoid NoResourceFoundException.
 */
@RestController
@RequestMapping("/api/id-card")
@CrossOrigin(origins = "*")
public class IdCardController {

    private static final Logger logger = LoggerFactory.getLogger(IdCardController.class);

    private final IdCardService idCardService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @Autowired
    public IdCardController(IdCardService idCardService, JwtUtil jwtUtil, UserRepository userRepository) {
        this.idCardService = idCardService;
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
        logger.info("IdCardController initialized and registered at /api/id-card");
    }

    private Long getCurrentUserId(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new BadRequestException("User not authenticated");
        }
        String token = authHeader.substring(7);
        return jwtUtil.extractUserId(token);
    }

    private boolean isAdmin(Long userId) {
        return userRepository.findWithRoleById(userId)
                .map(u -> u.getRole() != null && u.getRole().getType() == RoleType.ADMIN)
                .orElse(false);
    }

    /**
     * Get ID card HTML preview.
     * Mapped to: GET /api/id-card/preview
     */
    @GetMapping(value = "/preview", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public ResponseEntity<String> getPreview(
            @RequestParam(value = "employeeId", required = false) Long employeeIdParam,
            HttpServletRequest request) {
        
        Long currentUserId = getCurrentUserId(request);
        Long targetUserId;

        if (employeeIdParam == null) {
            targetUserId = currentUserId;
        } else {
            if (!isAdmin(currentUserId)) {
                throw new ForbiddenException("Only admins can view other employees' ID cards");
            }
            targetUserId = employeeIdParam;
        }

        String html = idCardService.generateHtml(targetUserId);
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(html);
    }

    /**
     * Get ID card as PDF.
     * Mapped to: GET /api/id-card/pdf
     */
    @GetMapping(value = "/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @ResponseBody
    public ResponseEntity<byte[]> getPdf(
            @RequestParam(value = "download", required = false) Boolean download,
            @RequestParam(value = "employeeId", required = false) Long employeeIdParam,
            HttpServletRequest request) {
        
        logger.info("Received request for ID card PDF: download={}, employeeId={}", download, employeeIdParam);
        
        Long currentUserId = getCurrentUserId(request);
        Long targetUserId;

        if (employeeIdParam == null) {
            targetUserId = currentUserId;
        } else {
            if (!isAdmin(currentUserId)) {
                throw new ForbiddenException("Only admins can download other employees' ID cards");
            }
            targetUserId = employeeIdParam;
        }

        byte[] pdf = idCardService.generatePdf(targetUserId);
        String disposition = Boolean.TRUE.equals(download) ? "attachment" : "inline";
        String filename = "id-card.pdf";

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + filename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .body(pdf);
    }

    /**
     * Bulk download ID cards as ZIP (admin only).
     */
    @PostMapping(value = "/bulk-pdf", produces = "application/zip")
    @ResponseBody
    public ResponseEntity<byte[]> bulkPdf(@RequestBody BulkIdCardRequest body, HttpServletRequest request) {
        Long currentUserId = getCurrentUserId(request);
        if (!isAdmin(currentUserId)) {
            throw new ForbiddenException("Only admins can download ID cards in bulk");
        }
        if (body.getEmployeeIds() == null || body.getEmployeeIds().isEmpty()) {
            throw new BadRequestException("Select at least one employee");
        }
        byte[] zip = idCardService.generatePdfZip(body.getEmployeeIds());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/zip"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"id-cards.zip\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .body(zip);
    }

    public static class BulkIdCardRequest {
        private List<Long> employeeIds;

        public List<Long> getEmployeeIds() {
            return employeeIds;
        }

        public void setEmployeeIds(List<Long> employeeIds) {
            this.employeeIds = employeeIds;
        }
    }
}
