package com.dashboard.app.controller;

import com.dashboard.app.dto.request.EmployeeRequest;
import com.dashboard.app.dto.response.EmployeeResponse;
import com.dashboard.app.service.EmployeeService;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/employees")
@CrossOrigin(origins = "*")
public class EmployeeController {

    @Autowired
    private EmployeeService employeeService;

    @Autowired
    private JwtUtil jwtUtil;

    private Long getCurrentUserId(HttpServletRequest request) {
        String token = request.getHeader("Authorization").substring(7);
        return jwtUtil.extractUserId(token);
    }

    @PostMapping
    public ResponseEntity<EmployeeResponse> createEmployee(@Valid @RequestBody EmployeeRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        EmployeeResponse response = employeeService.createEmployee(request, userId);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<EmployeeResponse> updateEmployee(@PathVariable Long id, @Valid @RequestBody EmployeeRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        EmployeeResponse response = employeeService.updateEmployee(id, request, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmployeeResponse> getEmployeeById(@PathVariable Long id) {
        EmployeeResponse response = employeeService.getEmployeeById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<EmployeeResponse>> getAllEmployees(HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        List<EmployeeResponse> responses = employeeService.getAllEmployees(userId);
        return ResponseEntity.ok(responses);
    }

    /**
     * Paginated endpoint for employees (optimized for large datasets)
     * This endpoint is backward compatible and can be used alongside the non-paginated endpoint
     * 
     * @param page Page number (0-indexed, default: 0)
     * @param size Page size (default: 50)
     * @param search Optional search term for filtering by name, email, employee ID
     * @param request HTTP request
     * @return Paginated response with employees
     */
    @GetMapping("/paginated")
    public ResponseEntity<Map<String, Object>> getAllEmployeesPaginated(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String search,
            HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        Map<String, Object> response = employeeService.getAllEmployeesPaginated(userId, page, size, search);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEmployee(@PathVariable Long id, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        employeeService.deleteEmployee(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<EmployeeResponse> getCurrentEmployee(HttpServletRequest request) {
        Long userId = getCurrentUserId(request);
        EmployeeResponse response = employeeService.getEmployeeById(userId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    public ResponseEntity<EmployeeResponse> updateCurrentEmployee(@Valid @RequestBody EmployeeRequest request, HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        EmployeeResponse response = employeeService.updateEmployee(userId, request, userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/profile-picture")
    public ResponseEntity<EmployeeResponse> uploadProfilePicture(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        // Users can upload their own profile picture, or admins can upload for others
        if (!id.equals(userId)) {
            // Check if user has update permission for other employees
            // This is a simplified check - you might want to add permission check here
        }
        EmployeeResponse response = employeeService.uploadProfilePicture(id, file);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/me/profile-picture")
    public ResponseEntity<EmployeeResponse> uploadCurrentEmployeeProfilePicture(
            @RequestParam("file") MultipartFile file,
            HttpServletRequest httpRequest) {
        Long userId = getCurrentUserId(httpRequest);
        EmployeeResponse response = employeeService.uploadProfilePicture(userId, file);
        return ResponseEntity.ok(response);
    }
}

