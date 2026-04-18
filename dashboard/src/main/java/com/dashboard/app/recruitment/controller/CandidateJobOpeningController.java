package com.dashboard.app.recruitment.controller;

import com.dashboard.app.recruitment.dto.response.JobOpeningResponse;
import com.dashboard.app.recruitment.service.JobOpeningService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recruitment/candidate/job-openings")
@CrossOrigin(origins = "*")
public class CandidateJobOpeningController {

    @Autowired
    private JobOpeningService jobOpeningService;

    @GetMapping
    public ResponseEntity<List<JobOpeningResponse>> getActiveJobOpenings() {
        List<JobOpeningResponse> jobOpenings = jobOpeningService.getActiveJobOpeningsForCandidates();
        return ResponseEntity.ok(jobOpenings);
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobOpeningResponse> getActiveJobOpeningById(@PathVariable Long id) {
        JobOpeningResponse response = jobOpeningService.getActiveJobOpeningByIdForCandidate(id);
        return ResponseEntity.ok(response);
    }
}
