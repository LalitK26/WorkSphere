package com.dashboard.app.recruitment.dto.request;

import com.dashboard.app.recruitment.model.CandidateEducation;
import lombok.Data;
import java.util.List;

@Data
public class CandidateProfileRequest {
    // Personal Info (Basic user updates if needed)
    private String firstName;
    private String middleName;
    private String lastName;
    private String phoneNumber;

    // Address Info
    private String streetAddress;
    private String city;
    private String state;
    private String zipCode;
    private String country;

    // Experience Info
    private Integer fresherYears;
    private Integer experiencedYears;

    // Documents
    private String resumeUrl;
    private String portfolioUrl;
    private String linkedInUrl;
    private String experienceLetterUrl;

    // Education
    private List<CandidateEducation> education;

    // Status
    private boolean isCompleted;
}
