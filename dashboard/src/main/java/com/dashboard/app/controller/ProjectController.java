package com.dashboard.app.controller;

import com.dashboard.app.dto.request.ProjectRequest;
import com.dashboard.app.dto.response.ProjectResponse;
import com.dashboard.app.service.ProjectService;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@CrossOrigin(origins = "*")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

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
    public ResponseEntity<ProjectResponse> createProject(@Valid @RequestBody ProjectRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        ProjectResponse response = projectService.createProject(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectResponse> updateProject(@PathVariable Long id, @Valid @RequestBody ProjectRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        ProjectResponse response = projectService.updateProject(id, request, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> getProjectById(@PathVariable Long id, HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        ProjectResponse response = projectService.getProjectById(id, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<ProjectResponse>> getAllProjects(HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        List<ProjectResponse> responses = projectService.getAllProjects(userId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/pinned")
    public ResponseEntity<List<ProjectResponse>> getPinnedProjects() {
        return ResponseEntity.ok(projectService.getPinnedProjects());
    }

    @GetMapping("/my-projects")
    public ResponseEntity<List<ProjectResponse>> getMyProjects(HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        List<ProjectResponse> responses = projectService.getProjectsByUserId(userId);
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProject(@PathVariable Long id, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        projectService.deleteProject(id, userId);
        return ResponseEntity.noContent().build();
    }
}

