package com.dashboard.app.controller;

import com.dashboard.app.dto.request.DesignationRequest;
import com.dashboard.app.dto.response.DesignationResponse;
import com.dashboard.app.service.DesignationService;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/designations")
@CrossOrigin(origins = "*")
public class DesignationController {

    @Autowired
    private DesignationService designationService;

    @Autowired
    private JwtUtil jwtUtil;

    private Long getCurrentUserId(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            return jwtUtil.extractUserId(token);
        }
        return null;
    }

    @PostMapping
    public ResponseEntity<DesignationResponse> createDesignation(@Valid @RequestBody DesignationRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        DesignationResponse response = designationService.createDesignation(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DesignationResponse> updateDesignation(@PathVariable Long id, @Valid @RequestBody DesignationRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        DesignationResponse response = designationService.updateDesignation(id, request, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DesignationResponse> getDesignationById(@PathVariable Long id) {
        DesignationResponse response = designationService.getDesignationById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<DesignationResponse>> getAllDesignations(
            @RequestParam(value = "search", required = false) String search,
            HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        List<DesignationResponse> responses = designationService.getAllDesignations(search, userId);
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDesignation(@PathVariable Long id, HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        designationService.deleteDesignation(id, userId);
        return ResponseEntity.noContent().build();
    }
}

