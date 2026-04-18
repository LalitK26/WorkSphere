package com.dashboard.app.recruitment.dto.response;

import lombok.Data;

@Data
public class AadhaarSubmitOtpResponse {
    private boolean verified;
    private String message;
    private AadhaarDataResponse aadhaarData;
}

