package com.dashboard.app.service;

import com.dashboard.app.dto.request.DepartmentRequest;
import com.dashboard.app.dto.response.DepartmentResponse;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ForbiddenException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.Department;
import com.dashboard.app.repository.DepartmentRepository;
import com.dashboard.app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class DepartmentService {

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PermissionService permissionService;

    public DepartmentResponse createDepartment(DepartmentRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        // Check if user has add permission
        String addPermission = permissionService.getModulePermission(currentUserId, "Department", "add");
        if ("None".equals(addPermission)) {
            throw new ForbiddenException("You do not have permission to create departments");
        }

        // For reference data like departments, only "All" permission allows creation
        if (!"All".equals(addPermission)) {
            throw new ForbiddenException("You do not have permission to create departments");
        }

        if (departmentRepository.existsByName(request.getName())) {
            throw new BadRequestException("Department name already exists");
        }

        Department department = new Department();
        department.setName(request.getName().trim());
        department.setDescription(normalizeDescription(request.getDescription()));

        department.setParentDepartment(resolveParentDepartment(request.getParentDepartmentId(), null));

        Department saved = departmentRepository.save(department);
        return mapToResponse(saved);
    }

    public DepartmentResponse updateDepartment(Long id, DepartmentRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        // Check if user has update permission
        String updatePermission = permissionService.getModulePermission(currentUserId, "Department", "update");
        if ("None".equals(updatePermission)) {
            throw new ForbiddenException("You do not have permission to update departments");
        }

        // For reference data like departments, only "All" permission allows update
        if (!"All".equals(updatePermission)) {
            throw new ForbiddenException("You do not have permission to update departments");
        }

        if (!department.getName().equals(request.getName()) && 
            departmentRepository.existsByName(request.getName())) {
            throw new BadRequestException("Department name already exists");
        }

        department.setName(request.getName().trim());
        department.setDescription(normalizeDescription(request.getDescription()));

        department.setParentDepartment(resolveParentDepartment(request.getParentDepartmentId(), id));

        Department updated = departmentRepository.save(department);
        return mapToResponse(updated);
    }

    public DepartmentResponse getDepartmentById(Long id) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
        return mapToResponse(department);
    }

    public List<DepartmentResponse> getAllDepartments(String search, Long currentUserId) {
        if (currentUserId == null) {
            return new java.util.ArrayList<>();
        }

        String viewPermission = permissionService.getModulePermission(currentUserId, "Department", "view");
        
        // If no permission, return empty list
        if ("None".equals(viewPermission)) {
            return new java.util.ArrayList<>();
        }

        // For reference data like departments, if user has any view permission, return all
        List<Department> source;
        if (StringUtils.hasText(search)) {
            source = departmentRepository.findByNameContainingIgnoreCase(search.trim());
        } else {
            source = departmentRepository.findAll();
        }

        return source.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void deleteDepartment(Long id, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        // Check if user has delete permission
        String deletePermission = permissionService.getModulePermission(currentUserId, "Department", "delete");
        if ("None".equals(deletePermission)) {
            throw new ForbiddenException("You do not have permission to delete departments");
        }

        // For reference data like departments, only "All" permission allows deletion
        if (!"All".equals(deletePermission)) {
            throw new ForbiddenException("You do not have permission to delete departments");
        }

        // Check if any users are using this department
        long usersWithDepartment = userRepository.countByDepartment(department.getName());
        if (usersWithDepartment > 0) {
            throw new BadRequestException("Cannot delete department. " + usersWithDepartment + " employee(s) are assigned to this department.");
        }

        // Check if any child departments exist
        List<Department> childDepartments = departmentRepository.findByParentDepartmentId(id);
        if (!childDepartments.isEmpty()) {
            throw new BadRequestException("Cannot delete department. It has " + childDepartments.size() + " child department(s).");
        }

        departmentRepository.deleteById(id);
    }

    private Department resolveParentDepartment(Long parentId, Long currentId) {
        if (parentId == null) {
            return null;
        }

        if (currentId != null && parentId.equals(currentId)) {
            throw new BadRequestException("Department cannot be its own parent");
        }

        return departmentRepository.findById(parentId)
                .orElseThrow(() -> new ResourceNotFoundException("Parent department not found"));
    }

    private String normalizeDescription(String description) {
        if (!StringUtils.hasText(description)) {
            return null;
        }
        return description.trim();
    }

    private DepartmentResponse mapToResponse(Department department) {
        DepartmentResponse response = new DepartmentResponse();
        response.setId(department.getId());
        response.setName(department.getName());
        response.setDescription(department.getDescription());
        response.setParentDepartmentId(department.getParentDepartment() != null ? department.getParentDepartment().getId() : null);
        response.setParentDepartmentName(department.getParentDepartment() != null ? department.getParentDepartment().getName() : null);
        response.setCreatedAt(department.getCreatedAt());
        response.setUpdatedAt(department.getUpdatedAt());
        return response;
    }
}



