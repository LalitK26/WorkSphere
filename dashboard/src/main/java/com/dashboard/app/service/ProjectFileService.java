package com.dashboard.app.service;

import com.dashboard.app.dto.response.ProjectFileResponse;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ForbiddenException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.Project;
import com.dashboard.app.model.ProjectFile;
import com.dashboard.app.model.User;
import com.dashboard.app.repository.ProjectFileRepository;
import com.dashboard.app.repository.ProjectRepository;
import com.dashboard.app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProjectFileService {

    @Autowired
    private ProjectFileRepository projectFileRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private FileStorageService fileStorageService;

    public List<ProjectFileResponse> getFiles(Long projectId) {
        return projectFileRepository.findByProjectId(projectId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public ProjectFileResponse uploadFile(Long projectId, MultipartFile multipartFile, Long userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        User uploader = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Upload file to local storage
        String filePath = fileStorageService.uploadProjectFile(multipartFile);

        ProjectFile projectFile = new ProjectFile();
        projectFile.setProject(project);
        projectFile.setUploadedBy(uploader);
        projectFile.setOriginalFileName(multipartFile.getOriginalFilename());
        projectFile.setCloudinaryUrl(filePath); // Store file path (keeping field name for compatibility)
        projectFile.setContentType(multipartFile.getContentType());
        projectFile.setSizeInBytes(multipartFile.getSize());

        ProjectFile saved = projectFileRepository.save(projectFile);
        return mapToResponse(saved);
    }

    public ResponseEntity<Resource> downloadFile(Long fileId, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        ProjectFile projectFile = projectFileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        Project project = projectFile.getProject();
        if (project == null) {
            throw new ResourceNotFoundException("Project not found for this file");
        }

        // Check if user has view permission for Projects
        String viewPermission = permissionService.getModulePermission(currentUserId, "Projects", "view");
        if ("None".equals(viewPermission)) {
            throw new ForbiddenException("You do not have permission to download project files");
        }

        // If "All" permission, allow access
        if ("All".equals(viewPermission)) {
            return redirectToCloudinaryUrl(projectFile);
        }

        // For other permissions, check if user is a member, admin, or creator of the project
        Long createdBy = project.getCreatedBy() != null ? project.getCreatedBy().getId() : null;
        Long projectAdmin = project.getProjectAdmin() != null ? project.getProjectAdmin().getId() : null;
        List<Long> memberIds = project.getMembers() != null 
                ? project.getMembers().stream().map(User::getId).collect(Collectors.toList())
                : new java.util.ArrayList<>();
        
        boolean canAccess = permissionService.canAccessItem(
                currentUserId, "Projects", "view",
                createdBy, projectAdmin, memberIds
        );
        
        if (!canAccess) {
            throw new ForbiddenException("You do not have permission to download this file");
        }

        return redirectToCloudinaryUrl(projectFile);
    }

    private ResponseEntity<Resource> redirectToCloudinaryUrl(ProjectFile projectFile) {
        // Load file from local storage and return as Resource
        if (projectFile.getCloudinaryUrl() == null || projectFile.getCloudinaryUrl().isEmpty()) {
            throw new ResourceNotFoundException("File path not found");
        }
        
        Resource resource = fileStorageService.loadFileAsResource(projectFile.getCloudinaryUrl());
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, 
                        "attachment; filename=\"" + projectFile.getOriginalFileName() + "\"")
                .header(HttpHeaders.CONTENT_TYPE, projectFile.getContentType())
                .body(resource);
    }

    public void deleteFile(Long fileId) {
        ProjectFile projectFile = projectFileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));
        
        // Delete file from local storage
        if (projectFile.getCloudinaryUrl() != null && !projectFile.getCloudinaryUrl().isEmpty()) {
            fileStorageService.deleteFile(projectFile.getCloudinaryUrl());
        }
        
        projectFileRepository.delete(projectFile);
    }

    private String extractExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1);
    }

    private ProjectFileResponse mapToResponse(ProjectFile file) {
        ProjectFileResponse response = new ProjectFileResponse();
        response.setId(file.getId());
        response.setOriginalFileName(file.getOriginalFileName());
        response.setContentType(file.getContentType());
        response.setSizeInBytes(file.getSizeInBytes());
        response.setUploadedById(file.getUploadedBy() != null ? file.getUploadedBy().getId() : null);
        response.setUploadedByName(file.getUploadedBy() != null ? file.getUploadedBy().getFullName() : null);
        response.setUploadedAt(file.getUploadedAt());
        // Return download endpoint URL
        response.setDownloadUrl("/api/project-files/" + file.getId() + "/download");
        return response;
    }
}


