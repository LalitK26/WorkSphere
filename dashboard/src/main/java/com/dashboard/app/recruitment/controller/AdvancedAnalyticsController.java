package com.dashboard.app.recruitment.controller;

import com.dashboard.app.recruitment.service.AdvancedAnalyticsService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/recruitment/analytics")
@CrossOrigin(origins = "*")
public class AdvancedAnalyticsController {

    @Autowired
    private AdvancedAnalyticsService advancedAnalyticsService;

    @GetMapping("/hiring-activity")
    public ResponseEntity<Map<String, Object>> getHiringActivityOverTime(
            @RequestParam(defaultValue = "weekly") String period,
            HttpServletRequest httpRequest) {
        Map<String, Object> data = advancedAnalyticsService.getHiringActivityOverTime(period, httpRequest);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/recruiter-performance")
    public ResponseEntity<Map<String, Object>> getRecruiterPerformance(HttpServletRequest httpRequest) {
        Map<String, Object> data = advancedAnalyticsService.getRecruiterPerformance(httpRequest);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/technical-interviewer-overview")
    public ResponseEntity<Map<String, Object>> getTechnicalInterviewerOverview(HttpServletRequest httpRequest) {
        Map<String, Object> data = advancedAnalyticsService.getTechnicalInterviewerOverview(httpRequest);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/offer-hiring-insights")
    public ResponseEntity<Map<String, Object>> getOfferAndHiringInsights(HttpServletRequest httpRequest) {
        Map<String, Object> data = advancedAnalyticsService.getOfferAndHiringInsights(httpRequest);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/department-role-analysis")
    public ResponseEntity<Map<String, Object>> getDepartmentRoleAnalysis(HttpServletRequest httpRequest) {
        Map<String, Object> data = advancedAnalyticsService.getDepartmentRoleAnalysis(httpRequest);
        return ResponseEntity.ok(data);
    }
}
