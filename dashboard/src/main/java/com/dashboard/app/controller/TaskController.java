package com.dashboard.app.controller;

import com.dashboard.app.dto.request.TaskRequest;
import com.dashboard.app.dto.response.TaskResponse;
import com.dashboard.app.service.TaskAttachmentService;
import com.dashboard.app.service.TaskService;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "*")
public class TaskController {

    @Autowired
    private TaskService taskService;

    @Autowired
    private TaskAttachmentService taskAttachmentService;

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
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody TaskRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        TaskResponse response = taskService.createTask(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponse> updateTask(@PathVariable Long id, @Valid @RequestBody TaskRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        TaskResponse response = taskService.updateTask(id, request, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> getTaskById(@PathVariable Long id, HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        TaskResponse response = taskService.getTaskById(id, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<TaskResponse>> getAllTasks(HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        List<TaskResponse> responses = taskService.getAllTasks(userId);
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<TaskResponse>> getTasksByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(taskService.getTasksByProject(projectId));
    }

    @GetMapping("/my-tasks")
    public ResponseEntity<List<TaskResponse>> getMyTasks(HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        List<TaskResponse> responses = taskService.getTasksByUserId(userId);
        return ResponseEntity.ok(responses);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        taskService.deleteTask(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{taskId}/attachment")
    public ResponseEntity<TaskResponse> uploadAttachment(@PathVariable Long taskId, @RequestParam("file") MultipartFile file, HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        return ResponseEntity.ok(taskAttachmentService.upload(taskId, file, userId));
    }

    @DeleteMapping("/{taskId}/attachment")
    public ResponseEntity<Void> deleteAttachment(@PathVariable Long taskId) {
        taskAttachmentService.delete(taskId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{taskId}/attachment")
    public ResponseEntity<org.springframework.core.io.Resource> downloadAttachment(@PathVariable Long taskId) {
        return taskAttachmentService.download(taskId);
    }
}

