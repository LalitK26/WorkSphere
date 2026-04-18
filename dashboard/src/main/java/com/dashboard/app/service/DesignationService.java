package com.dashboard.app.service;

import com.dashboard.app.dto.request.DesignationRequest;
import com.dashboard.app.dto.response.DesignationResponse;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ForbiddenException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.Designation;
import com.dashboard.app.repository.DesignationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class DesignationService {

    @Autowired
    private DesignationRepository designationRepository;

    @Autowired
    private PermissionService permissionService;

    public DesignationResponse createDesignation(DesignationRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        // Check if user has add permission
        String addPermission = permissionService.getModulePermission(currentUserId, "Designations", "add");
        if ("None".equals(addPermission)) {
            throw new ForbiddenException("You do not have permission to create designations");
        }

        // For reference data like designations, only "All" permission allows creation
        if (!"All".equals(addPermission)) {
            throw new ForbiddenException("You do not have permission to create designations");
        }

        if (designationRepository.existsByName(request.getName())) {
            throw new BadRequestException("Designation name already exists");
        }

        Designation designation = new Designation();
        designation.setName(request.getName());
        designation.setDescription(normalizeDescription(request.getDescription()));

        designation.setParentDesignation(resolveParentDesignation(request.getParentDesignationId(), null));

        Designation saved = designationRepository.save(designation);
        return mapToResponse(saved);
    }

    public DesignationResponse updateDesignation(Long id, DesignationRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Designation designation = designationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Designation not found"));

        // Check if user has update permission
        String updatePermission = permissionService.getModulePermission(currentUserId, "Designations", "update");
        if ("None".equals(updatePermission)) {
            throw new ForbiddenException("You do not have permission to update designations");
        }

        // For reference data like designations, only "All" permission allows update
        if (!"All".equals(updatePermission)) {
            throw new ForbiddenException("You do not have permission to update designations");
        }

        if (!designation.getName().equals(request.getName()) && 
            designationRepository.existsByName(request.getName())) {
            throw new BadRequestException("Designation name already exists");
        }

        designation.setName(request.getName());
        designation.setDescription(normalizeDescription(request.getDescription()));

        designation.setParentDesignation(resolveParentDesignation(request.getParentDesignationId(), id));

        Designation updated = designationRepository.save(designation);
        return mapToResponse(updated);
    }

    public DesignationResponse getDesignationById(Long id) {
        Designation designation = designationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Designation not found"));
        return mapToResponse(designation);
    }

    public List<DesignationResponse> getAllDesignations(String search, Long currentUserId) {
        if (currentUserId == null) {
            return new java.util.ArrayList<>();
        }

        String viewPermission = permissionService.getModulePermission(currentUserId, "Designations", "view");
        
        // If no permission, return empty list
        if ("None".equals(viewPermission)) {
            return new java.util.ArrayList<>();
        }

        // For reference data like designations, if user has any view permission, return all
        List<Designation> source;
        if (StringUtils.hasText(search)) {
            source = designationRepository.findByNameContainingIgnoreCase(search.trim());
        } else {
            source = designationRepository.findAll();
        }

        return source.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void deleteDesignation(Long id, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        if (!designationRepository.existsById(id)) {
            throw new ResourceNotFoundException("Designation not found");
        }

        // Check if user has delete permission
        String deletePermission = permissionService.getModulePermission(currentUserId, "Designations", "delete");
        if ("None".equals(deletePermission)) {
            throw new ForbiddenException("You do not have permission to delete designations");
        }

        // For reference data like designations, only "All" permission allows deletion
        if (!"All".equals(deletePermission)) {
            throw new ForbiddenException("You do not have permission to delete designations");
        }

        designationRepository.deleteById(id);
    }

    private Designation resolveParentDesignation(Long parentId, Long currentId) {
        if (parentId == null) {
            return null;
        }

        if (currentId != null && parentId.equals(currentId)) {
            throw new BadRequestException("Designation cannot be its own parent");
        }

        return designationRepository.findById(parentId)
                .orElseThrow(() -> new ResourceNotFoundException("Parent designation not found"));
    }

    private String normalizeDescription(String description) {
        if (!StringUtils.hasText(description)) {
            return null;
        }
        return description.trim();
    }

    private DesignationResponse mapToResponse(Designation designation) {
        DesignationResponse response = new DesignationResponse();
        response.setId(designation.getId());
        response.setName(designation.getName());
        response.setDescription(designation.getDescription());
        response.setParentDesignationId(designation.getParentDesignation() != null ? designation.getParentDesignation().getId() : null);
        response.setParentDesignationName(designation.getParentDesignation() != null ? designation.getParentDesignation().getName() : null);
        response.setCreatedAt(designation.getCreatedAt());
        return response;
    }
}

