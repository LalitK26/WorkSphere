package com.dashboard.app.recruitment.controller;

import com.dashboard.app.recruitment.dto.request.CreateJobOpeningRequest;
import com.dashboard.app.recruitment.dto.request.UpdateJobOpeningRequest;
import com.dashboard.app.recruitment.dto.response.JobOpeningResponse;
import com.dashboard.app.recruitment.dto.response.JobOpeningStatisticsResponse;
import com.dashboard.app.recruitment.service.JobOpeningService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/recruitment/job-openings")
@CrossOrigin(origins = "*")
public class JobOpeningController {

    @Autowired
    private JobOpeningService jobOpeningService;

    @PostMapping
    public ResponseEntity<JobOpeningResponse> createJobOpening(
            @Valid @RequestBody CreateJobOpeningRequest request,
            HttpServletRequest httpRequest) {
        JobOpeningResponse response = jobOpeningService.createJobOpening(request, httpRequest);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<JobOpeningResponse>> getAllJobOpenings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            HttpServletRequest httpRequest) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size,
                org.springframework.data.domain.Sort.by("createdAt").descending());
        org.springframework.data.domain.Page<JobOpeningResponse> jobOpenings = jobOpeningService
                .getAllJobOpenings(pageable, httpRequest);
        return ResponseEntity.ok(jobOpenings);
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobOpeningResponse> getJobOpeningById(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        JobOpeningResponse response = jobOpeningService.getJobOpeningById(id, httpRequest);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<JobOpeningResponse> updateJobOpening(
            @PathVariable Long id,
            @Valid @RequestBody UpdateJobOpeningRequest request,
            HttpServletRequest httpRequest) {
        JobOpeningResponse response = jobOpeningService.updateJobOpening(id, request, httpRequest);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/close")
    public ResponseEntity<JobOpeningResponse> closeJobOpening(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {
        JobOpeningResponse response = jobOpeningService.closeJobOpening(id, httpRequest);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/statistics")
    public ResponseEntity<JobOpeningStatisticsResponse> getStatistics(HttpServletRequest httpRequest) {
        JobOpeningStatisticsResponse statistics = jobOpeningService.getStatistics(httpRequest);
        return ResponseEntity.ok(statistics);
    }
}
