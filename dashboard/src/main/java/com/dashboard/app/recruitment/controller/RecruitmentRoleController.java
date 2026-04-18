package com.dashboard.app.recruitment.controller;

import com.dashboard.app.recruitment.dto.request.RecruitmentRoleRequest;
import com.dashboard.app.recruitment.dto.response.RecruitmentRoleResponse;
import com.dashboard.app.recruitment.service.RecruitmentRoleService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recruitment/roles")
@CrossOrigin(origins = "*")
public class RecruitmentRoleController {

    @Autowired
    private RecruitmentRoleService recruitmentRoleService;

    @PostMapping
    public ResponseEntity<RecruitmentRoleResponse> createRecruitmentRole(@Valid @RequestBody RecruitmentRoleRequest request) {
        RecruitmentRoleResponse response = recruitmentRoleService.createRecruitmentRole(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RecruitmentRoleResponse> updateRecruitmentRole(
            @PathVariable Long id, 
            @Valid @RequestBody RecruitmentRoleRequest request) {
        RecruitmentRoleResponse response = recruitmentRoleService.updateRecruitmentRole(id, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RecruitmentRoleResponse> getRecruitmentRoleById(@PathVariable Long id) {
        RecruitmentRoleResponse response = recruitmentRoleService.getRecruitmentRoleById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<RecruitmentRoleResponse>> getAllRecruitmentRoles() {
        try {
            List<RecruitmentRoleResponse> responses = recruitmentRoleService.getAllRecruitmentRoles();
            return ResponseEntity.ok(responses);
        } catch (Exception e) {
            org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(RecruitmentRoleController.class);
            logger.error("Error in getAllRecruitmentRoles endpoint: {}", e.getMessage(), e);
            throw e;
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecruitmentRole(@PathVariable Long id) {
        recruitmentRoleService.deleteRecruitmentRole(id);
        return ResponseEntity.noContent().build();
    }
}

