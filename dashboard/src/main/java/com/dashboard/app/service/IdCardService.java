package com.dashboard.app.service;

import com.dashboard.app.dto.response.EmployeeResponse;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.User;
import com.dashboard.app.repository.UserRepository;
import com.lowagie.text.DocumentException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.xhtmlrenderer.pdf.ITextRenderer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * Service for generating the current employee's virtual ID card as PDF.
 * Uses template and background from src/main/resources/idcard templates/.
 */
@Service
public class IdCardService {

    private static final Logger logger = LoggerFactory.getLogger(IdCardService.class);
    private static final String TEMPLATE_PATH = "idcard templates/id-card.html";
    private static final String TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

    private final UserRepository userRepository;
    private final EmployeeService employeeService;
    private final FileStorageService fileStorageService;

    public IdCardService(UserRepository userRepository, EmployeeService employeeService, FileStorageService fileStorageService) {
        this.userRepository = userRepository;
        this.employeeService = employeeService;
        this.fileStorageService = fileStorageService;
    }

    /**
     * Generate ID card PDF for the given user.
     */
    public byte[] generatePdf(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
        EmployeeResponse profile = employeeService.getEmployeeById(user.getId());
        String html = buildIdCardHtml(user, profile);
        return htmlToPdf(html);
    }

    /**
     * Generate HTML for ID card preview (Employee Preview).
     * Ensures images are accessible in the browser.
     */
    public String generateHtml(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
        EmployeeResponse profile = employeeService.getEmployeeById(user.getId());
        
        String html = buildIdCardHtml(user, profile);
        
        // Adjust background image path for browser (assuming it's in public folder)
        // From: url('Interns%20ID%20Cards.png')
        // To: url('/Interns%20ID%20Cards.png')
        // This ensures it works from any route (e.g. /dashboard/id-card)
        return html.replace("url('Interns%20ID%20Cards.png')", "url('/Interns%20ID%20Cards.png')");
    }

    /**
     * Generate a ZIP containing one PDF per selected employee (for admin bulk download).
     */
    public byte[] generatePdfZip(List<Long> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty()) {
            throw new IllegalArgumentException("At least one employee must be selected");
        }
        try (ByteArrayOutputStream zipOut = new ByteArrayOutputStream();
             ZipOutputStream zos = new ZipOutputStream(zipOut)) {
            for (Long userId : employeeIds) {
                try {
                    User user = userRepository.findById(userId).orElse(null);
                    if (user == null) continue;
                    byte[] pdf = generatePdf(userId);
                    String safeName = (user.getFirstName() + "_" + user.getLastName()).replaceAll("[^a-zA-Z0-9_-]", "_");
                    String filename = "id-card-" + safeName + "-" + userId + ".pdf";
                    zos.putNextEntry(new ZipEntry(filename));
                    zos.write(pdf);
                    zos.closeEntry();
                } catch (Exception e) {
                    logger.warn("Skipping ID card for user {}: {}", userId, e.getMessage());
                }
            }
            zos.finish();
            return zipOut.toByteArray();
        } catch (IOException e) {
            logger.error("Failed to create ID cards ZIP", e);
            throw new RuntimeException("Failed to generate ID cards archive: " + e.getMessage(), e);
        }
    }

    private String loadTemplate() throws IOException {
        ClassPathResource resource = new ClassPathResource(TEMPLATE_PATH);
        return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    }

    private String buildIdCardHtml(User user, EmployeeResponse profile) {
        try {
            String template = loadTemplate();

            String fullName = profile.getFullName() != null ? escapeHtml(profile.getFullName().toUpperCase()) : "—";
            String designation = profile.getDesignationName() != null ? escapeHtml(profile.getDesignationName()) : "—";
            String employeeId = profile.getEmployeeId() != null ? escapeHtml(profile.getEmployeeId()) : "—";
            String joiningDateFormatted = "—";
            if (profile.getJoiningDate() != null) {
                joiningDateFormatted = formatOrdinalDate(profile.getJoiningDate());
            }

            String photoContent = buildPhotoContent(user.getProfilePictureUrl());

            template = template.replace("{{photoContent}}", photoContent);
            template = template.replace("{{fullName}}", fullName);
            template = template.replace("{{designation}}", designation);
            template = template.replace("{{employeeId}}", employeeId);
            template = template.replace("{{joiningDateFormatted}}", joiningDateFormatted);
            
            // Handle icons (using transparent pixel if actual files are missing to prevent broken images)
            template = template.replace("{{iconMail}}", TRANSPARENT_PIXEL);
            template = template.replace("{{iconWeb}}", TRANSPARENT_PIXEL);
            template = template.replace("{{iconPhone}}", TRANSPARENT_PIXEL);

            return template;
        } catch (IOException e) {
            logger.error("Failed to load ID card template", e);
            throw new ResourceNotFoundException("ID card template not found: " + TEMPLATE_PATH);
        }
    }

    private String buildPhotoContent(String profilePicturePath) {
        if (profilePicturePath == null || profilePicturePath.isEmpty()) {
            return "<div class=\"photo-placeholder\">No photo</div>";
        }
        if (profilePicturePath.startsWith("http://") || profilePicturePath.startsWith("https://")) {
            return "<div class=\"photo-placeholder\">No photo</div>";
        }
        try {
            Resource resource = fileStorageService.loadFileAsResource(profilePicturePath);
            byte[] bytes = resource.getInputStream().readAllBytes();
            String base64 = Base64.getEncoder().encodeToString(bytes);
            String mime = "image/jpeg";
            if (profilePicturePath.toLowerCase().endsWith(".png")) mime = "image/png";
            if (profilePicturePath.toLowerCase().endsWith(".webp")) mime = "image/webp";
            return "<img src=\"data:" + mime + ";base64," + base64 + "\" alt=\"Photo\" />";
        } catch (Exception e) {
            logger.warn("Could not load profile image for ID card: {}", e.getMessage());
            return "<div class=\"photo-placeholder\">No photo</div>";
        }
    }

    private String formatOrdinalDate(LocalDate date) {
        int day = date.getDayOfMonth();
        String suffix = day == 1 || day == 21 || day == 31 ? "st" : (day == 2 || day == 22 ? "nd" : (day == 3 || day == 23 ? "rd" : "th"));
        return day + suffix + " " + date.format(DateTimeFormatter.ofPattern("MMM yyyy"));
    }

    private static String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    private byte[] htmlToPdf(String htmlContent) {
        if (htmlContent == null || htmlContent.trim().isEmpty()) {
            throw new IllegalArgumentException("HTML content cannot be null or empty");
        }
        ITextRenderer renderer = null;
        try {
            String baseUrl;
            ClassPathResource resource = new ClassPathResource("idcard templates/");
            baseUrl = resource.getURL().toExternalForm();

            renderer = new ITextRenderer();
            renderer.setDocumentFromString(htmlContent, baseUrl);
            renderer.layout();

            try (java.io.ByteArrayOutputStream outputStream = new java.io.ByteArrayOutputStream()) {
                renderer.createPDF(outputStream);
                byte[] pdfBytes = outputStream.toByteArray();
                logger.info("Generated ID card PDF, size: {} bytes", pdfBytes.length);
                return pdfBytes;
            }
        } catch (DocumentException e) {
            logger.error("DocumentException generating ID card PDF", e);
            throw new RuntimeException("Failed to generate ID card PDF: " + e.getMessage(), e);
        } catch (IOException e) {
            logger.error("IOException generating ID card PDF", e);
            throw new RuntimeException("Failed to generate ID card PDF: " + e.getMessage(), e);
        } finally {
            if (renderer != null) {
                try {
                    renderer.finishPDF();
                } catch (Exception e) {
                    logger.warn("Error finishing PDF renderer: {}", e.getMessage());
                }
            }
        }
    }
}
