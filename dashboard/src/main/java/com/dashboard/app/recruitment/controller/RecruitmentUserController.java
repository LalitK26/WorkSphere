package com.dashboard.app.recruitment.controller;

import com.dashboard.app.recruitment.dto.request.CreateRecruitmentUserRequest;
import com.dashboard.app.recruitment.dto.request.UpdateRecruitmentUserRequest;
import com.dashboard.app.recruitment.dto.response.RecruitmentUserResponse;
import com.dashboard.app.recruitment.service.RecruitmentUserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recruitment/users")
@CrossOrigin(origins = "*")
public class RecruitmentUserController {

    @Autowired
    private RecruitmentUserService recruitmentUserService;

    @PostMapping
    public ResponseEntity<RecruitmentUserResponse> createRecruitmentUser(@Valid @RequestBody CreateRecruitmentUserRequest request) {
        RecruitmentUserResponse response = recruitmentUserService.createRecruitmentUser(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<RecruitmentUserResponse>> getAllRecruitmentUsers() {
        List<RecruitmentUserResponse> users = recruitmentUserService.getAllRecruitmentUsers();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RecruitmentUserResponse> getRecruitmentUserById(@PathVariable Long id) {
        RecruitmentUserResponse response = recruitmentUserService.getRecruitmentUserById(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RecruitmentUserResponse> updateRecruitmentUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRecruitmentUserRequest request) {
        RecruitmentUserResponse response = recruitmentUserService.updateRecruitmentUser(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecruitmentUser(@PathVariable Long id) {
        recruitmentUserService.deleteRecruitmentUser(id);
        return ResponseEntity.noContent().build();
    }
}

