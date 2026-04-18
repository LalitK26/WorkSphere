package com.dashboard.app.recruitment.service;

import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.recruitment.model.Candidate;
import com.dashboard.app.recruitment.model.CandidateProfile;
import com.dashboard.app.recruitment.model.OfferLetter;
import com.dashboard.app.recruitment.repository.CandidateProfileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class OfferTemplateService {

    private static final Logger logger = LoggerFactory.getLogger(OfferTemplateService.class);
    private static final String TEMPLATE_PATH = "offer-templates/internship-offer.html";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("MMMM dd, yyyy");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("MMMM dd, yyyy 'at' hh:mm a");

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    /**
     * Load the HTML template from resources
     */
    private String loadTemplate() throws IOException {
        ClassPathResource resource = new ClassPathResource(TEMPLATE_PATH);
        return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    }

    /**
     * Generate HTML content by replacing placeholders with actual data
     */
    public String generateOfferHtml(OfferLetter offer) {
        try {
            String template = loadTemplate();
            
            if (offer == null) {
                throw new IllegalArgumentException("Offer letter cannot be null");
            }
            
            Candidate candidate = offer.getCandidate();
            if (candidate == null) {
                throw new IllegalArgumentException("Candidate cannot be null");
            }
            
            // Get candidate profile for address
            CandidateProfile profile = candidateProfileRepository.findByCandidateId(candidate.getId())
                    .orElse(null);
            
            String candidateAddress = buildCandidateAddress(profile);
            
            // Replace all placeholders with null-safe values
            template = template.replace("{{candidate_name}}", 
                candidate.getFullName() != null ? candidate.getFullName() : "N/A");
            template = template.replace("{{candidate_address}}", candidateAddress);
            template = template.replace("{{employee_id}}", 
                offer.getEmployeeId() != null ? offer.getEmployeeId() : "N/A");
            template = template.replace("{{offer_date}}", 
                offer.getOfferDate() != null ? offer.getOfferDate().format(DATE_FORMATTER) : "N/A");
            template = template.replace("{{job_title}}", 
                offer.getJobTitle() != null ? offer.getJobTitle() : "N/A");
            template = template.replace("{{position}}", 
                offer.getPosition() != null ? offer.getPosition() : "N/A");
            template = template.replace("{{department}}", 
                offer.getDepartment() != null ? offer.getDepartment() : "N/A");
            template = template.replace("{{stipend_amount}}", 
                offer.getStipendAmount() != null ? offer.getStipendAmount() : "N/A");
            template = template.replace("{{ctc_amount}}", 
                offer.getCtcAmount() != null ? offer.getCtcAmount() : "N/A");
            template = template.replace("{{joining_date}}", 
                offer.getJoiningDate() != null ? offer.getJoiningDate().format(DATE_FORMATTER) : "N/A");
            template = template.replace("{{company_name}}", "Thynk Technology India");
            
            // Get HR/Recruiter information from createdBy
            String hrName = "N/A";
            String hrContactName = "the HR team";
            String hrTitlePrefix = "";
            String hrDesignation = "Sr. Manager, Human Resources";
            
            if (offer.getCreatedBy() != null) {
                String originalName = offer.getCreatedBy().getName() != null ? offer.getCreatedBy().getName() : "N/A";
                
                // Remove any existing title prefix from the name for cleaner display
                String cleanName = originalName;
                if (originalName.toLowerCase().startsWith("miss.") || originalName.toLowerCase().startsWith("miss ")) {
                    hrTitlePrefix = "Miss.";
                    cleanName = originalName.substring(originalName.toLowerCase().indexOf("miss") + 4).trim();
                } else if (originalName.toLowerCase().startsWith("mr.") || originalName.toLowerCase().startsWith("mr ")) {
                    hrTitlePrefix = "Mr.";
                    cleanName = originalName.substring(originalName.toLowerCase().indexOf("mr") + 2).trim();
                } else if (originalName.toLowerCase().startsWith("mrs.") || originalName.toLowerCase().startsWith("mrs ")) {
                    hrTitlePrefix = "Mrs.";
                    cleanName = originalName.substring(originalName.toLowerCase().indexOf("mrs") + 3).trim();
                } else {
                    // Default to Miss. if no prefix found (can be customized per organization)
                    hrTitlePrefix = "Miss.";
                    cleanName = originalName;
                }
                hrName = cleanName;
                hrContactName = cleanName;
            }
            
            // Replace HR-related placeholders
            template = template.replace("{{hr_name}}", hrName);
            template = template.replace("{{hr_contact_name}}", hrContactName);
            template = template.replace("{{hr_title_prefix}}", hrTitlePrefix);
            template = template.replace("{{hr_designation}}", hrDesignation);
            
            // Generate current date and time for offer generation timestamp
            LocalDateTime now = LocalDateTime.now();
            String generationDateTime = now.format(DATETIME_FORMATTER);
            template = template.replace("{{generation_datetime}}", generationDateTime);
            
            logger.info("Successfully generated HTML for offer letter ID: {}", offer.getId());
            return template;
        } catch (IOException e) {
            logger.error("Failed to load offer template", e);
            throw new ResourceNotFoundException("Offer template not found: " + TEMPLATE_PATH);
        } catch (Exception e) {
            logger.error("Failed to generate offer HTML for offer ID: {}", offer != null ? offer.getId() : "null", e);
            throw new RuntimeException("Failed to generate offer HTML: " + e.getMessage(), e);
        }
    }

    /**
     * Build candidate address from profile
     */
    private String buildCandidateAddress(CandidateProfile profile) {
        if (profile == null || profile.getStreetAddress() == null) {
            return "Address not provided";
        }
        
        StringBuilder address = new StringBuilder();
        
        if (profile.getStreetAddress() != null && !profile.getStreetAddress().isEmpty()) {
            address.append(profile.getStreetAddress());
        }
        
        if (profile.getCity() != null && !profile.getCity().isEmpty()) {
            if (address.length() > 0) address.append(", ");
            address.append(profile.getCity());
        }
        
        if (profile.getState() != null && !profile.getState().isEmpty()) {
            if (address.length() > 0) address.append(", ");
            address.append(profile.getState());
        }
        
        if (profile.getCountry() != null && !profile.getCountry().isEmpty()) {
            if (address.length() > 0) address.append(", ");
            address.append(profile.getCountry());
        }
        
        if (profile.getZipCode() != null && !profile.getZipCode().isEmpty()) {
            if (address.length() > 0) address.append(" - ");
            address.append(profile.getZipCode());
        }
        
        return address.length() > 0 ? address.toString() : "Address not provided";
    }
}
