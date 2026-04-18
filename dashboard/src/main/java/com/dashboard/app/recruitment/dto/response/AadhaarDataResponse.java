package com.dashboard.app.recruitment.dto.response;

import lombok.Data;

@Data
public class AadhaarDataResponse {
    private String fullName;
    private String firstName;
    private String middleName;
    private String lastName;
    private String dateOfBirth;
    private String address;
    private String careOf;
    private String district;
    private String state;
    private String pincode;
}

