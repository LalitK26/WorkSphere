package com.dashboard.app.service;

import com.dashboard.app.dto.request.ProjectRequest;
import com.dashboard.app.dto.response.ProjectMemberDto;
import com.dashboard.app.dto.response.ProjectResponse;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ForbiddenException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.Department;
import com.dashboard.app.model.Project;
import com.dashboard.app.model.ProjectCategory;
import com.dashboard.app.model.User;
import com.dashboard.app.model.enums.ProjectStatus;
import com.dashboard.app.model.enums.TaskStatus;
import com.dashboard.app.repository.DepartmentRepository;
import com.dashboard.app.repository.ProjectCategoryRepository;
import com.dashboard.app.repository.ProjectRepository;
import com.dashboard.app.repository.TaskRepository;
import com.dashboard.app.repository.UserRepository;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;


@Service
@Transactional
public class ProjectService {

    private static final Logger logger = LoggerFactory.getLogger(ProjectService.class);

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private ProjectCategoryRepository projectCategoryRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private DashboardEmailService dashboardEmailService;

    public ProjectResponse createProject(ProjectRequest request, Long createdById) {
        // Check if user has add permission
        String addPermission = permissionService.getModulePermission(createdById, "Projects", "add");
        if ("None".equals(addPermission)) {
            throw new com.dashboard.app.exception.ForbiddenException("You do not have permission to create projects");
        }

        User createdBy = userRepository.findById(createdById)
                .orElseThrow(() -> new ResourceNotFoundException("Creator not found"));

        Project project = new Project();
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setSummary(request.getSummary());
        project.setCode(request.getCode() != null ? request.getCode() : generateProjectCode());
        project.setStartDate(request.getStartDate());
        project.setDeadline(request.getDeadline());
        project.setProgressPercentage(request.getProgressPercentage() != null ? request.getProgressPercentage() : 0);
        // Handle status with validation to prevent IllegalArgumentException in production
        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            try {
                project.setStatus(ProjectStatus.valueOf(request.getStatus().toUpperCase()));
            } catch (IllegalArgumentException e) {
                // If invalid status provided, default to PLANNING
                project.setStatus(ProjectStatus.PLANNING);
            }
        } else {
            project.setStatus(ProjectStatus.PLANNING);
        }
        project.setAutoProgress(request.getAutoProgress() != null ? request.getAutoProgress() : Boolean.FALSE);
        project.setPinned(request.getPinned() != null ? request.getPinned() : Boolean.FALSE);
        project.setBudget(request.getBudget() != null ? BigDecimal.valueOf(request.getBudget()) : null);
        project.setCreatedBy(createdBy);

        if (request.getClientId() != null) {
            User client = userRepository.findById(request.getClientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
            project.setClient(client);
        }

        if (request.getProjectAdminId() != null) {
            User admin = userRepository.findById(request.getProjectAdminId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project admin not found"));
            project.setProjectAdmin(admin);
        }

        if (request.getDepartmentId() != null) {
            Department department = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
            project.setDepartment(department);
        }

        if (request.getCategoryId() != null) {
            ProjectCategory category = projectCategoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project category not found"));
            project.setCategory(category);
        }

        if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            // Filter out null and invalid IDs to prevent issues in production
            List<Long> validMemberIds = request.getMemberIds().stream()
                    .filter(id -> id != null && id > 0)
                    .collect(Collectors.toList());
            if (!validMemberIds.isEmpty()) {
                List<User> members = userRepository.findAllById(validMemberIds);
                project.setMembers(members);
            } else {
                project.setMembers(new java.util.ArrayList<>());
            }
        } else {
            // Initialize members list to empty to avoid null pointer exceptions
            project.setMembers(new java.util.ArrayList<>());
        }

        Project saved = projectRepository.save(project);

        if (Boolean.TRUE.equals(project.getAutoProgress())) {
            refreshProgressFromTasks(saved);
        }

        // Send email notifications to assigned members
        if (saved.getMembers() != null && !saved.getMembers().isEmpty()) {
            String projectAdminName = saved.getProjectAdmin() != null 
                    ? saved.getProjectAdmin().getFullName() : createdBy.getFullName();
            for (User member : saved.getMembers()) {
                try {
                    if (member.getEmail() != null) {
                        dashboardEmailService.sendProjectAssignedNotification(
                            member.getEmail(),
                            member.getFullName(),
                            saved.getName(),
                            saved.getCode(),
                            saved.getStartDate(),
                            saved.getDeadline(),
                            projectAdminName,
                            saved.getId()
                        );
                        logger.info("Project assignment notification sent to: {}", member.getEmail());
                    }
                } catch (Exception e) {
                    logger.error("Failed to send project assignment notification to {}: {}", member.getEmail(), e.getMessage(), e);
                }
            }
        }

        return mapToResponse(saved);
    }

    public ProjectResponse updateProject(Long id, ProjectRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        // Check if user has update permission
        String updatePermission = permissionService.getModulePermission(currentUserId, "Projects", "update");
        if ("None".equals(updatePermission)) {
            throw new ForbiddenException("You do not have permission to update projects");
        }

        // If permission is "Added" or "Owned", check ownership
        if (!"All".equals(updatePermission)) {
            Long createdBy = project.getCreatedBy() != null ? project.getCreatedBy().getId() : null;
            Long projectAdmin = project.getProjectAdmin() != null ? project.getProjectAdmin().getId() : null;
            List<Long> memberIds = project.getMembers() != null 
                    ? project.getMembers().stream().map(User::getId).collect(Collectors.toList())
                    : new java.util.ArrayList<>();
            
            boolean canAccess = permissionService.canAccessItem(
                    currentUserId, "Projects", "update",
                    createdBy, projectAdmin, memberIds
            );
            if (!canAccess) {
                throw new ForbiddenException("You do not have permission to update this project");
            }
        }


        if (request.getName() != null) {
            project.setName(request.getName());
        }
        if (request.getDescription() != null) {
            project.setDescription(request.getDescription());
        }
        if (request.getSummary() != null) {
            project.setSummary(request.getSummary());
        }
        if (request.getStartDate() != null) {
            project.setStartDate(request.getStartDate());
        }
        if (request.getDeadline() != null) {
            project.setDeadline(request.getDeadline());
        }
        if (request.getBudget() != null) {
            project.setBudget(BigDecimal.valueOf(request.getBudget()));
        }
        if (request.getProgressPercentage() != null) {
            project.setProgressPercentage(request.getProgressPercentage());
        }

        if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
            try {
                project.setStatus(ProjectStatus.valueOf(request.getStatus().toUpperCase()));
            } catch (IllegalArgumentException e) {
                // If invalid status provided, keep existing status
                logger.warn("Invalid status provided: {}, keeping existing status: {}", request.getStatus(), project.getStatus());
            }
        }

        if (request.getClientId() != null) {
            User client = userRepository.findById(request.getClientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
            project.setClient(client);
        }

        if (request.getProjectAdminId() != null) {
            User admin = userRepository.findById(request.getProjectAdminId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project admin not found"));
            project.setProjectAdmin(admin);
        }

        if (request.getDepartmentId() != null) {
            Department department = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
            project.setDepartment(department);
        }

        if (request.getCategoryId() != null) {
            ProjectCategory category = projectCategoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project category not found"));
            project.setCategory(category);
        }

        // Track existing member IDs before update
        Set<Long> existingMemberIds = project.getMembers() != null 
                ? project.getMembers().stream().map(User::getId).collect(Collectors.toSet())
                : new HashSet<>();

        if (request.getMemberIds() != null) {
            List<User> members = userRepository.findAllById(request.getMemberIds());
            project.setMembers(members);
        } else {
            // Ensure members list is initialized to avoid null pointer exceptions
            if (project.getMembers() == null) {
                project.setMembers(new java.util.ArrayList<>());
            }
        }

        if (request.getPinned() != null) {
            project.setPinned(request.getPinned());
        }

        if (request.getAutoProgress() != null) {
            project.setAutoProgress(request.getAutoProgress());
        }

        Project updated = projectRepository.save(project);

        if (Boolean.TRUE.equals(updated.getAutoProgress())) {
            refreshProgressFromTasks(updated);
        }

        // Send notification to newly added members
        if (updated.getMembers() != null && !updated.getMembers().isEmpty() && request.getMemberIds() != null) {
            String projectAdminName = updated.getProjectAdmin() != null 
                    ? updated.getProjectAdmin().getFullName() : "Project Manager";
            for (User member : updated.getMembers()) {
                if (!existingMemberIds.contains(member.getId())) {
                    try {
                        if (member.getEmail() != null) {
                            dashboardEmailService.sendProjectAssignedNotification(
                                member.getEmail(),
                                member.getFullName(),
                                updated.getName(),
                                updated.getCode(),
                                updated.getStartDate(),
                                updated.getDeadline(),
                                projectAdminName,
                                updated.getId()
                            );
                            logger.info("Project assignment notification sent to new member: {}", member.getEmail());
                        }
                    } catch (Exception e) {
                        logger.error("Failed to send project assignment notification to {}: {}", member.getEmail(), e.getMessage(), e);
                    }
                }
            }
        }

        return mapToResponse(updated);
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProjectById(Long id, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        // Check if user has view permission
        String viewPermission = permissionService.getModulePermission(currentUserId, "Projects", "view");
        if ("None".equals(viewPermission)) {
            throw new ForbiddenException("You do not have permission to view projects");
        }

        // If "All" permission, allow access
        if ("All".equals(viewPermission)) {
            return mapToResponse(project);
        }

        // For other permissions, check ownership
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
            throw new ForbiddenException("You do not have permission to view this project");
        }

        return mapToResponse(project);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> getAllProjects(Long currentUserId) {
        if (currentUserId == null) {
            return new java.util.ArrayList<>();
        }

        String viewPermission = permissionService.getModulePermission(currentUserId, "Projects", "view");
        
        // If no permission, return empty list
        if ("None".equals(viewPermission)) {
            return new java.util.ArrayList<>();
        }
        
        // If "All" permission, return all projects
        if ("All".equals(viewPermission)) {
            return projectRepository.findAll().stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }
        
        // Filter based on permission level
        List<Project> allProjects = projectRepository.findAll();
        
        return allProjects.stream()
                .filter(project -> {
                    Long createdBy = project.getCreatedBy() != null ? project.getCreatedBy().getId() : null;
                    Long projectAdmin = project.getProjectAdmin() != null ? project.getProjectAdmin().getId() : null;
                    List<Long> memberIds = project.getMembers() != null 
                            ? project.getMembers().stream().map(User::getId).collect(Collectors.toList())
                            : new java.util.ArrayList<>();
                    
                    return permissionService.canAccessItem(
                            currentUserId, "Projects", "view",
                            createdBy, projectAdmin, memberIds
                    );
                })
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> getProjectsByUserId(Long userId) {
        if (userId == null) {
            throw new BadRequestException("User id is required");
        }
        return projectRepository.findVisibleProjectsForUser(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> getPinnedProjects() {
        return projectRepository.findByPinnedTrue().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void deleteProject(Long id, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found"));

        // Check if user has delete permission
        String deletePermission = permissionService.getModulePermission(currentUserId, "Projects", "delete");
        if ("None".equals(deletePermission)) {
            throw new ForbiddenException("You do not have permission to delete projects");
        }

        // If permission is "Added" or "Owned", check ownership
        if (!"All".equals(deletePermission)) {
            Long createdBy = project.getCreatedBy() != null ? project.getCreatedBy().getId() : null;
            Long projectAdmin = project.getProjectAdmin() != null ? project.getProjectAdmin().getId() : null;
            List<Long> memberIds = project.getMembers() != null 
                    ? project.getMembers().stream().map(User::getId).collect(Collectors.toList())
                    : new java.util.ArrayList<>();
            
            boolean canAccess = permissionService.canAccessItem(
                    currentUserId, "Projects", "delete",
                    createdBy, projectAdmin, memberIds
            );
            if (!canAccess) {
                throw new ForbiddenException("You do not have permission to delete this project");
            }
        }

        projectRepository.deleteById(id);
    }

    private String generateProjectCode() {
        return "PROJ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private ProjectResponse mapToResponse(Project project) {
        ProjectResponse response = new ProjectResponse();
        List<User> members = project.getMembers();
        // Handle null members to prevent NullPointerException in production
        if (members == null) {
            members = new java.util.ArrayList<>();
        }
        List<Long> memberIds = members.stream().map(User::getId).collect(Collectors.toList());
        List<String> memberNames = members.stream().map(User::getFirstName).collect(Collectors.toList());
        List<ProjectMemberDto> memberDtos = members.stream().map(this::mapMember).collect(Collectors.toList());
        response.setId(project.getId());
        response.setCode(project.getCode());
        response.setName(project.getName());
        response.setDescription(project.getDescription());
        response.setSummary(project.getSummary());
        response.setStatus(project.getStatus().name());
        response.setStartDate(project.getStartDate());
        response.setDeadline(project.getDeadline());
        response.setProgressPercentage(project.getProgressPercentage());
        response.setAutoProgress(project.getAutoProgress());
        response.setPinned(project.getPinned());
        response.setBudget(project.getBudget() != null ? project.getBudget().doubleValue() : null);
        response.setClientId(project.getClient() != null ? project.getClient().getId() : null);
        response.setClientName(project.getClient() != null ? project.getClient().getFullName() : null);
        response.setMemberIds(memberIds);   
        response.setMemberNames(memberNames);
        response.setMembers(memberDtos);
        response.setProjectAdminId(project.getProjectAdmin() != null ? project.getProjectAdmin().getId() : null);
        response.setProjectAdminName(
                project.getProjectAdmin() != null ? project.getProjectAdmin().getFullName() : null);
        response.setDepartmentId(project.getDepartment() != null ? project.getDepartment().getId() : null);
        response.setDepartmentName(project.getDepartment() != null ? project.getDepartment().getName() : null);
        response.setCategoryId(project.getCategory() != null ? project.getCategory().getId() : null);
        response.setCategoryName(project.getCategory() != null ? project.getCategory().getName() : null);
        response.setCreatedAt(project.getCreatedAt());

        long totalTasks = taskRepository.countByProjectId(project.getId());
        long completedTasks = taskRepository.countByProjectIdAndStatus(project.getId(), TaskStatus.COMPLETED);
        response.setTotalTasks(totalTasks);
        response.setCompletedTasks(completedTasks);

        return response;
    }

    private ProjectMemberDto mapMember(User user) {
        ProjectMemberDto dto = new ProjectMemberDto();
        dto.setId(user.getId());
        dto.setName(user.getFullName());
        dto.setEmail(user.getEmail());
        dto.setProfilePictureUrl(com.dashboard.app.util.FileUrlUtil.convertFilePathToUrl(user.getProfilePictureUrl()));
        dto.setDesignation(user.getDesignation() != null ? user.getDesignation().getName() : null);
        return dto;
    }

    private void refreshProgressFromTasks(Project project) {
        if (project.getId() == null) {
            return;
        }
        long totalTasks = taskRepository.countByProjectId(project.getId());
        if (totalTasks == 0) {
            project.setProgressPercentage(0);
            return;
        }
        long completedTasks = taskRepository.countByProjectIdAndStatus(project.getId(), TaskStatus.COMPLETED);
        int percent = (int) Math.round((completedTasks * 100.0) / totalTasks);
        project.setProgressPercentage(percent);
        projectRepository.save(project);
    }
}
