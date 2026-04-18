package com.dashboard.app.recruitment.controller;

import com.dashboard.app.recruitment.dto.request.ApplyForJobRequest;
import com.dashboard.app.recruitment.dto.request.UpdateApplicationStatusRequest;
import com.dashboard.app.recruitment.dto.response.JobApplicationResponse;
import com.dashboard.app.recruitment.dto.response.JobTitleStatisticsResponse;
import com.dashboard.app.recruitment.service.JobApplicationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recruitment/job-applications")
@CrossOrigin(origins = "*")
public class JobApplicationController {

    @Autowired
    private JobApplicationService jobApplicationService;

    @PostMapping("/apply/{jobOpeningId}")
    public ResponseEntity<JobApplicationResponse> applyForJob(
            @PathVariable Long jobOpeningId,
            @Valid @RequestBody ApplyForJobRequest request,
            HttpServletRequest httpRequest) {
        JobApplicationResponse response = jobApplicationService.applyForJob(jobOpeningId, request, httpRequest);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/my-applications")
    public ResponseEntity<List<JobApplicationResponse>> getMyApplications(HttpServletRequest httpRequest) {
        List<JobApplicationResponse> applications = jobApplicationService.getMyApplications(httpRequest);
        return ResponseEntity.ok(applications);
    }

    @GetMapping("/all")
    public ResponseEntity<org.springframework.data.domain.Page<JobApplicationResponse>> getAllApplications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            HttpServletRequest httpRequest) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<JobApplicationResponse> applications = jobApplicationService
                .getAllApplications(pageable, httpRequest);
        return ResponseEntity.ok(applications);
    }

    @GetMapping(value = "/statistics/by-job-title", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<JobTitleStatisticsResponse>> getJobTitleStatistics(HttpServletRequest httpRequest) {
        List<JobTitleStatisticsResponse> statistics = jobApplicationService.getJobTitleStatistics(httpRequest);
        return ResponseEntity.ok(statistics);
    }

    @GetMapping("/by-job-title")
    public ResponseEntity<List<JobApplicationResponse>> getApplicationsByJobTitle(
            @RequestParam String jobTitle,
            HttpServletRequest httpRequest) {
        List<JobApplicationResponse> applications = jobApplicationService.getApplicationsByJobTitle(jobTitle,
                httpRequest);
        return ResponseEntity.ok(applications);
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobApplicationResponse> getApplicationById(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        JobApplicationResponse response = jobApplicationService.getApplicationById(id, httpRequest);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<JobApplicationResponse> updateApplicationStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateApplicationStatusRequest request,
            HttpServletRequest httpRequest) {
        JobApplicationResponse response = jobApplicationService.updateApplicationStatus(id, request, httpRequest);
        return ResponseEntity.ok(response);
    }
}
