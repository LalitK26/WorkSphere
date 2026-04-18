package com.dashboard.app.controller;

import com.dashboard.app.dto.request.CategoryRequest;
import com.dashboard.app.dto.response.CategoryResponse;
import com.dashboard.app.service.ProjectCategoryService;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/project-categories")
@CrossOrigin(origins = "*")
public class ProjectCategoryController {

    @Autowired
    private ProjectCategoryService projectCategoryService;

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

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> getAll() {
        return ResponseEntity.ok(projectCategoryService.getAll());
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CategoryRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        return ResponseEntity.ok(projectCategoryService.create(request, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        projectCategoryService.delete(id);
        return ResponseEntity.noContent().build();
    }
}


