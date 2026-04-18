package com.dashboard.app.recruitment.service;

import com.dashboard.app.recruitment.dto.response.OfferDocumentResponse;
import com.dashboard.app.service.FileStorageService;
import com.dashboard.app.recruitment.model.OfferDocument;
import com.dashboard.app.recruitment.model.OfferLetter;
import com.dashboard.app.recruitment.model.RecruitmentUser;
import com.dashboard.app.recruitment.model.enums.DocumentType;
import com.dashboard.app.recruitment.model.enums.DocumentVerificationStatus;
import com.dashboard.app.recruitment.repository.OfferDocumentRepository;
import com.dashboard.app.recruitment.repository.OfferLetterRepository;
import com.dashboard.app.recruitment.repository.RecruitmentUserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OfferDocumentService {

    private static final Logger logger = LoggerFactory.getLogger(OfferDocumentService.class);

    @Autowired
    private OfferDocumentRepository offerDocumentRepository;

    @Autowired
    private OfferLetterRepository offerLetterRepository;

    @Autowired
    private RecruitmentUserRepository recruitmentUserRepository;

    @Autowired
    private com.dashboard.app.util.JwtUtil jwtUtil;

    @Autowired
    private FileStorageService fileStorageService;

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    private static final List<String> ALLOWED_FILE_TYPES = Arrays.asList("application/pdf", "image/jpeg", "image/png");
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList("pdf", "jpeg", "jpg", "png");
    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    /**
     * Initialize the offer-documents directory on service startup
     */
    @jakarta.annotation.PostConstruct
    private void initializeDirectory() {
        try {
            Path offerDocumentsPath = Paths.get(uploadDir, "offer-documents");
            if (!Files.exists(offerDocumentsPath)) {
                Files.createDirectories(offerDocumentsPath);
                logger.info("Created offer-documents directory at: {}", offerDocumentsPath.toAbsolutePath());
            } else {
                logger.info("Offer-documents directory already exists at: {}", offerDocumentsPath.toAbsolutePath());
            }
        } catch (IOException e) {
            logger.error("Failed to create offer-documents directory", e);
        }
    }

    /**
     * Upload or replace a document for an offer
     */
    @Transactional
    public OfferDocumentResponse uploadDocument(Long offerId, DocumentType documentType, MultipartFile file,
            HttpServletRequest httpRequest) {
        // Get authenticated user
        String userEmail = extractUserEmail(httpRequest);

        // Get offer letter
        OfferLetter offerLetter = offerLetterRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer letter not found"));

        // Check if candidate owns this offer
        if (!offerLetter.getCandidate().getEmail().equals(userEmail)) {
            throw new RuntimeException("Unauthorized: You can only upload documents for your own offers");
        }

        // Validate file
        validateFile(file);

        // Check if document already exists for this type and offer
        Optional<OfferDocument> existingDoc = offerDocumentRepository.findByOfferLetterAndDocumentType(offerLetter,
                documentType);

        OfferDocument document;
        if (existingDoc.isPresent()) {
            // Replace existing document
            document = existingDoc.get();
            // Delete old file
            deleteFile(document.getFilePath());
            // Auto-verify on upload - no manual verification needed
            document.setVerificationStatus(DocumentVerificationStatus.VERIFIED);
            document.setRemark(null);
            document.setVerifiedAt(LocalDateTime.now());
            document.setVerifiedBy(null); // Auto-verified, no specific user
        } else {
            // Create new document
            document = new OfferDocument();
            document.setOfferLetter(offerLetter);
            document.setDocumentType(documentType);
            // Auto-verify on upload - no manual verification needed
            document.setVerificationStatus(DocumentVerificationStatus.VERIFIED);
            document.setVerifiedAt(LocalDateTime.now());
            document.setVerifiedBy(null); // Auto-verified, no specific user
        }

        // Save file
        String filePath = saveFile(file, offerId, documentType);

        // Update document details
        document.setFileName(file.getOriginalFilename());
        document.setFileType(getFileExtension(file.getOriginalFilename()));
        document.setFilePath(filePath);
        document.setFileSize(file.getSize());

        document = offerDocumentRepository.save(document);

        // Update offer verification status
        updateOfferDocumentVerificationStatus(offerLetter);

        return convertToResponse(document);
    }

    /**
     * Get all documents for an offer
     */
    public List<OfferDocumentResponse> getDocumentsByOffer(Long offerId, HttpServletRequest httpRequest) {
        String userEmail = extractUserEmail(httpRequest);
        String userRole = extractUserRole(httpRequest);

        OfferLetter offerLetter = offerLetterRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer letter not found"));

        // Check access: Candidate can only view their own, Admin/Recruiter can view all
        if ("CANDIDATE".equals(userRole) && !offerLetter.getCandidate().getEmail().equals(userEmail)) {
            throw new RuntimeException("Unauthorized: You can only view documents for your own offers");
        }

        List<OfferDocument> documents = offerDocumentRepository.findByOfferLetterOrderByDocumentTypeAsc(offerLetter);
        return documents.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * View/Download a document
     */
    @Transactional(readOnly = true)
    public Resource viewDocument(Long documentId, HttpServletRequest httpRequest) {
        try {
            String userEmail = extractUserEmail(httpRequest);
            String userRole = extractUserRole(httpRequest);

            OfferDocument document = offerDocumentRepository.findById(documentId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

            // Check access
            if ("CANDIDATE".equals(userRole)
                    && !document.getOfferLetter().getCandidate().getEmail().equals(userEmail)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Unauthorized: You can only view your own documents");
            }

            // Log path for debugging
            logger.info("Attempting to view document: {} at path: {}", document.getFileName(),
                    document.getFilePath());

            // Use FileStorageService to robustly load the resource
            return fileStorageService.loadFileAsResource(document.getFilePath());

        } catch (ResponseStatusException e) {
            throw e;
        } catch (RuntimeException e) {
            if (e.getMessage() != null
                    && (e.getMessage().contains("File not found") || e.getMessage().contains("not readable"))) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found on server");
            }
            logger.error("Error loading file for documentId: " + documentId, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Error loading file: " + e.getMessage());
        } catch (Exception e) {
            logger.error("Error loading file for documentId: " + documentId, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Error loading file: " + e.getMessage());
        }
    }

    /**
     * Verify a document (Admin/Recruiter only)
     */
    @Transactional
    public OfferDocumentResponse verifyDocument(Long documentId, HttpServletRequest httpRequest) {
        String userEmail = extractUserEmail(httpRequest);
        String userRole = extractUserRole(httpRequest);

        // Only Admin/Recruiter can verify
        if (!"RECRUITMENT_ADMIN".equals(userRole) && !"RECRUITER".equals(userRole) && !"ADMIN".equals(userRole)) {
            throw new RuntimeException("Unauthorized: Only Admin/Recruiter can verify documents");
        }

        RecruitmentUser currentUser = recruitmentUserRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        OfferDocument document = offerDocumentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        document.setVerificationStatus(DocumentVerificationStatus.VERIFIED);
        document.setVerifiedAt(LocalDateTime.now());
        document.setVerifiedBy(currentUser);
        document.setRemark(null); // Clear any previous remark

        document = offerDocumentRepository.save(document);

        // Check if all mandatory documents are now verified
        updateOfferDocumentVerificationStatus(document.getOfferLetter());

        return convertToResponse(document);
    }

    /**
     * Request resubmission of a document (Admin/Recruiter only)
     */
    @Transactional
    public OfferDocumentResponse requestResubmission(Long documentId, String remark, HttpServletRequest httpRequest) {
        String userEmail = extractUserEmail(httpRequest);
        String userRole = extractUserRole(httpRequest);

        // Only Admin/Recruiter can request resubmission
        if (!"RECRUITMENT_ADMIN".equals(userRole) && !"RECRUITER".equals(userRole) && !"ADMIN".equals(userRole)) {
            throw new RuntimeException("Unauthorized: Only Admin/Recruiter can request resubmission");
        }

        OfferDocument document = offerDocumentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        document.setVerificationStatus(DocumentVerificationStatus.RESUBMIT_REQUIRED);
        document.setRemark(remark);
        document.setVerifiedAt(null);
        document.setVerifiedBy(null);

        document = offerDocumentRepository.save(document);

        // Update offer verification status
        updateOfferDocumentVerificationStatus(document.getOfferLetter());

        return convertToResponse(document);
    }

    /**
     * Check if all mandatory documents are verified for an offer
     */
    public boolean checkAllMandatoryDocumentsVerified(Long offerId) {
        OfferLetter offerLetter = offerLetterRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer letter not found"));

        return checkAllMandatoryDocumentsVerified(offerLetter);
    }

    /**
     * Check if all mandatory documents are verified (internal method)
     */
    private boolean checkAllMandatoryDocumentsVerified(OfferLetter offerLetter) {
        List<OfferDocument> documents = offerDocumentRepository.findByOfferLetter(offerLetter);

        // Get all mandatory document types
        Set<DocumentType> mandatoryTypes = Arrays.stream(DocumentType.values())
                .filter(DocumentType::isMandatory)
                .collect(Collectors.toSet());

        // Check if all mandatory documents are verified
        for (DocumentType mandatoryType : mandatoryTypes) {
            boolean isVerified = documents.stream()
                    .anyMatch(doc -> doc.getDocumentType() == mandatoryType
                            && doc.getVerificationStatus() == DocumentVerificationStatus.VERIFIED);

            if (!isVerified) {
                return false;
            }
        }

        return true;
    }

    /**
     * Update offer letter's document verification status
     */
    @Transactional
    public void updateOfferDocumentVerificationStatus(OfferLetter offerLetter) {
        boolean allVerified = checkAllMandatoryDocumentsVerified(offerLetter);
        offerLetter.setDocumentsVerified(allVerified);
        offerLetterRepository.save(offerLetter);
    }

    // Helper methods

    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("File size exceeds maximum limit of 5MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_FILE_TYPES.contains(contentType.toLowerCase())) {
            throw new RuntimeException("Invalid file type. Only PDF, JPEG, and PNG files are allowed");
        }

        String extension = getFileExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new RuntimeException("Invalid file extension. Only .pdf, .jpeg, .jpg, and .png files are allowed");
        }
    }

    private String saveFile(MultipartFile file, Long offerId, DocumentType documentType) {
        try {
            // Create directory structure: uploads/offer-documents/{offerId}/
            // Use "offer-documents" explicitly to ensure structure inside uploadDir
            Path uploadPath = Paths.get(uploadDir, "offer-documents", offerId.toString());

            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Sanitize and create unique filename
            String extension = getFileExtension(file.getOriginalFilename());
            String sanitizedFileName = documentType.name() + "_" + System.currentTimeMillis() + "." + extension;

            Path filePath = uploadPath.resolve(sanitizedFileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            logger.info("Saved file to: {}", filePath.toAbsolutePath());
            
            // Return a consistent relative path using forward slashes for cross-platform compatibility
            // This matches the pattern used in FileStorageService for other file types
            return "offer-documents/" + offerId + "/" + sanitizedFileName;
        } catch (IOException e) {
            logger.error("Failed to store file", e);
            throw new RuntimeException("Failed to store file: " + e.getMessage());
        }
    }

    private void deleteFile(String filePath) {
        fileStorageService.deleteFile(filePath);
    }

    private String getFileExtension(String filename) {
        if (filename == null || filename.isEmpty()) {
            return "";
        }
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1 || lastDotIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(lastDotIndex + 1);
    }

    private OfferDocumentResponse convertToResponse(OfferDocument document) {
        OfferDocumentResponse response = new OfferDocumentResponse();
        response.setId(document.getId());
        response.setOfferLetterId(document.getOfferLetter().getId());
        response.setDocumentType(document.getDocumentType());
        response.setDocumentTypeName(document.getDocumentType().getDisplayName());
        response.setFileName(document.getFileName());
        response.setFileType(document.getFileType());
        response.setFileSize(document.getFileSize());
        response.setVerificationStatus(document.getVerificationStatus());
        response.setVerificationStatusName(document.getVerificationStatus().getDisplayName());
        response.setRemark(document.getRemark());
        response.setUploadedAt(document.getUploadedAt());
        response.setVerifiedAt(document.getVerifiedAt());
        response.setVerifiedByName(document.getVerifiedBy() != null ? document.getVerifiedBy().getName() : null);
        response.setMandatory(document.getDocumentType().isMandatory());
        return response;
    }

    private String extractUserEmail(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            logger.warn("Missing or invalid Authorization header in request: {}", request.getRequestURI());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authorization header is missing or invalid");
        }
        String token = authHeader.substring(7);
        try {
            return jwtUtil.extractUsername(token);
        } catch (Exception e) {
            logger.error("Failed to extract username from token", e);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
        }
    }

    private String extractUserRole(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Authorization header is missing or invalid");
        }
        String token = authHeader.substring(7);
        return jwtUtil.extractRole(token);
    }
}
