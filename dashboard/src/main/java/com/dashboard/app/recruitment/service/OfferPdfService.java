package com.dashboard.app.recruitment.service;

import com.lowagie.text.DocumentException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.xhtmlrenderer.pdf.ITextRenderer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class OfferPdfService {

    private static final Logger logger = LoggerFactory.getLogger(OfferPdfService.class);

    /**
     * Convert HTML content to PDF
     * @param htmlContent The HTML content to convert
     * @return PDF as byte array
     */
    public byte[] generatePdfFromHtml(String htmlContent) {
        if (htmlContent == null || htmlContent.trim().isEmpty()) {
            logger.error("HTML content is null or empty");
            throw new IllegalArgumentException("HTML content cannot be null or empty");
        }

        ITextRenderer renderer = null;
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            renderer = new ITextRenderer();
            
            // Set base URL to resolve relative resource paths (e.g., images, CSS)
            // This allows Flying Saucer to find offer-bg.jpg and other resources
            String baseUrl = null;
            try {
                ClassPathResource resource = new ClassPathResource("offer-templates/");
                baseUrl = resource.getURL().toExternalForm();
                logger.debug("Base URL for PDF resources: {}", baseUrl);
            } catch (IOException e) {
                logger.warn("Could not resolve classpath resource URL, using fallback approach", e);
                // Fallback: try to construct URL from class location
                baseUrl = OfferPdfService.class.getResource("/offer-templates/").toExternalForm();
            }
            
            // Set the HTML content with base URL for resource resolution
            renderer.setDocumentFromString(htmlContent, baseUrl);
            
            // Layout the document
            renderer.layout();
            
            // Create PDF
            renderer.createPDF(outputStream);
            
            byte[] pdfBytes = outputStream.toByteArray();
            logger.info("Successfully generated PDF from HTML. PDF size: {} bytes", pdfBytes.length);
            return pdfBytes;
            
        } catch (DocumentException e) {
            logger.error("DocumentException while generating PDF: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate PDF document: " + e.getMessage(), e);
        } catch (IOException e) {
            logger.error("IOException while generating PDF: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to write PDF: " + e.getMessage(), e);
        } catch (Exception e) {
            logger.error("Unexpected error while generating PDF: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate PDF: " + e.getMessage(), e);
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
