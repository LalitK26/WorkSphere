package com.dashboard.app.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShiftRosterEmployeeResponse {
    private Long userId;
    private String fullName;
    private String designation;
    private String profilePictureUrl;
    private List<ShiftRosterDayResponse> days;
}


