package com.dashboard.app.recruitment.model.enums;

public enum OfferStatus {
    CREATED,   // Offer generated but not sent to candidate
    SENT,      // Offer sent to candidate, awaiting response
    ACCEPTED,  // Candidate accepted the offer
    REJECTED   // Candidate rejected the offer
}
