package com.dashboard.app.dto.request;

import lombok.Data;

@Data
public class ClockInRequest {
    private Double latitude;
    private Double longitude;
    private String location;
    private String workingFrom; // "office" or "home"
}




