package com.dashboard.app.controller;

import com.dashboard.app.dto.request.DepartmentRequest;
import com.dashboard.app.dto.response.DepartmentResponse;
import com.dashboard.app.service.DepartmentService;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/departments")
@CrossOrigin(origins = "*")
public class DepartmentController {

    @Autowired
    private DepartmentService departmentService;

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
    public ResponseEntity<DepartmentResponse> createDepartment(@Valid @RequestBody DepartmentRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        DepartmentResponse response = departmentService.createDepartment(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DepartmentResponse> updateDepartment(@PathVariable Long id, @Valid @RequestBody DepartmentRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        DepartmentResponse response = departmentService.updateDepartment(id, request, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DepartmentResponse> getDepartmentById(@PathVariable Long id) {
        DepartmentResponse response = departmentService.getDepartmentById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<DepartmentResponse>> getAllDepartments(
            @RequestParam(value = "search", required = false) String search,
            HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        List<DepartmentResponse> responses = departmentService.getAllDepartments(search, userId);
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDepartment(@PathVariable Long id, HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        departmentService.deleteDepartment(id, userId);
        return ResponseEntity.noContent().build();
    }
}



