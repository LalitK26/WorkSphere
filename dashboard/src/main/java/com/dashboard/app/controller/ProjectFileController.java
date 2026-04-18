package com.dashboard.app.controller;

import com.dashboard.app.dto.response.ProjectFileResponse;
import com.dashboard.app.service.ProjectFileService;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/project-files")
@CrossOrigin(origins = "*")
public class ProjectFileController {

    @Autowired
    private ProjectFileService projectFileService;

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

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<ProjectFileResponse>> listFiles(@PathVariable Long projectId) {
        return ResponseEntity.ok(projectFileService.getFiles(projectId));
    }

    @PostMapping("/project/{projectId}")
    public ResponseEntity<ProjectFileResponse> uploadFile(
            @PathVariable Long projectId,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request
    ) {
        Long userId = getCurrentUserId(request);
        return ResponseEntity.ok(projectFileService.uploadFile(projectId, file, userId));
    }

    @GetMapping("/{fileId}/download")
    public ResponseEntity<Resource> download(@PathVariable Long fileId, HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        return projectFileService.downloadFile(fileId, userId);
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<Void> deleteFile(@PathVariable Long fileId) {
        projectFileService.deleteFile(fileId);
        return ResponseEntity.noContent().build();
    }
}


