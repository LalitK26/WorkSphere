package com.dashboard.app.recruitment.model.enums;

public enum DocumentType {
    LEAVING_CERTIFICATE("Leaving Certificate", true, "AGE_VERIFICATION"),
    BIRTH_CERTIFICATE("Birth Certificate", true, "AGE_VERIFICATION"),
    AADHAR_CARD("Aadhar Card", true, "ADDRESS_VERIFICATION"),
    PAN_CARD("PAN Card", true, "IDENTITY_VERIFICATION"),
    PASSPORT_PHOTO("Passport Size Photo", true, "IDENTITY_VERIFICATION"),
    TENTH_MARKSHEET("10th Marksheet", true, "EDUCATION_VERIFICATION"),
    TWELFTH_MARKSHEET("12th Marksheet", true, "EDUCATION_VERIFICATION"),
    DIPLOMA_MARKSHEET("Diploma Marksheet", true, "EDUCATION_VERIFICATION"),
    BACHELOR_MARKSHEET("Bachelor's Degree Marksheet", true, "EDUCATION_VERIFICATION");

    private final String displayName;
    private final boolean mandatory;
    private final String verificationType;

    DocumentType(String displayName, boolean mandatory, String verificationType) {
        this.displayName = displayName;
        this.mandatory = mandatory;
        this.verificationType = verificationType;
    }

    public String getDisplayName() {
        return displayName;
    }

    public boolean isMandatory() {
        return mandatory;
    }

    public String getVerificationType() {
        return verificationType;
    }

    // Check if at least one age verification document is uploaded
    public static boolean isAgeVerificationDocument(DocumentType type) {
        return type == LEAVING_CERTIFICATE || type == BIRTH_CERTIFICATE;
    }
}
