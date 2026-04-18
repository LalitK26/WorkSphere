package com.dashboard.app.recruitment.model.enums;

public enum DocumentVerificationStatus {
    PENDING("Pending Verification"),
    VERIFIED("Document Uploaded"),
    RESUBMIT_REQUIRED("Re-submission Required");

    private final String displayName;

    DocumentVerificationStatus(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
