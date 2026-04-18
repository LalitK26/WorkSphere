package com.dashboard.app.service;

import com.dashboard.app.dto.request.TaskRequest;
import com.dashboard.app.dto.response.TaskResponse;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ForbiddenException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.Project;
import com.dashboard.app.model.Task;
import com.dashboard.app.model.TaskCategory;
import com.dashboard.app.model.User;
import com.dashboard.app.model.enums.RoleType;
import com.dashboard.app.model.enums.TaskPriority;
import com.dashboard.app.model.enums.TaskStatus;
import com.dashboard.app.repository.ProjectRepository;
import com.dashboard.app.repository.TaskCategoryRepository;
import com.dashboard.app.repository.TaskRepository;
import com.dashboard.app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class TaskService {

    private static final Logger logger = LoggerFactory.getLogger(TaskService.class);

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private TaskCategoryRepository taskCategoryRepository;

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private DashboardEmailService dashboardEmailService;

    public TaskResponse createTask(TaskRequest request, Long createdById) {
        User createdBy = userRepository.findById(createdById)
                .orElseThrow(() -> new ResourceNotFoundException("Creator not found"));

        // Determine assignees - prefer assignedToIds, fall back to assignedToId for backward compatibility
        java.util.List<Long> assigneeIds = request.getAssignedToIds();
        if (assigneeIds == null || assigneeIds.isEmpty()) {
            if (request.getAssignedToId() != null) {
                assigneeIds = java.util.Collections.singletonList(request.getAssignedToId());
            } else {
                throw new BadRequestException("At least one assignee is required");
            }
        }

        java.util.List<User> assignees = userRepository.findAllById(assigneeIds);
        if (assignees.size() != assigneeIds.size()) {
            throw new ResourceNotFoundException("One or more assigned users not found");
        }

        // Set primary assignee for backward compatibility (first assignee)
        User assignedTo = assignees.get(0);

        Project project = null;
        boolean isProjectAdmin = false;
        
        if (request.getProjectId() != null) {
            project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
            
            // Check if the creator is the project admin
            if (project.getProjectAdmin() != null && project.getProjectAdmin().getId().equals(createdById)) {
                isProjectAdmin = true;
            }
            
            // If user is project admin, they can assign tasks to project members
            if (isProjectAdmin) {
                // Validate that all assigned users are project members or the project admin
                java.util.Set<Long> projectMemberIds = new java.util.HashSet<>();
                if (project.getMembers() != null) {
                    project.getMembers().forEach(member -> projectMemberIds.add(member.getId()));
                }
                if (project.getProjectAdmin() != null) {
                    projectMemberIds.add(project.getProjectAdmin().getId());
                }
                
                for (User assignee : assignees) {
                    if (!projectMemberIds.contains(assignee.getId())) {
                        throw new ForbiddenException("You can only assign tasks to project members");
                    }
                }
            }
        }
        
        // Check if user has add permission (unless they are a project admin)
        if (!isProjectAdmin) {
            String addPermission = permissionService.getModulePermission(createdById, "Tasks", "add");
            if ("None".equals(addPermission)) {
                throw new ForbiddenException("You do not have permission to create tasks");
            }
        }

        Task task = new Task();
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setCode(request.getCode() != null ? request.getCode() : generateTaskCode());
        task.setAssignedTo(assignedTo); // Primary assignee for backward compatibility
        task.setAssignees(assignees); // Multiple assignees
        task.setCreatedBy(createdBy);
        task.setStartDate(request.getStartDate());
        task.setDueDate(request.getDueDate());
        task.setEstimatedHours(request.getEstimatedHours());
        task.setStatus(resolveStatus(request.getStatus()));
        task.setPriority(resolvePriority(request.getPriority()));
        task.setPinned(request.getPinned() != null ? request.getPinned() : Boolean.FALSE);

        if (project != null) {
            task.setProject(project);
        }

        if (request.getCategoryId() != null) {
            TaskCategory category = taskCategoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Task category not found"));
            task.setCategory(category);
        }

        Task saved = taskRepository.save(task);
        
        // Send email notifications to all assignees
        if (saved.getAssignees() != null && !saved.getAssignees().isEmpty()) {
            String projectName = saved.getProject() != null ? saved.getProject().getName() : null;
            for (User assignee : saved.getAssignees()) {
                try {
                    if (assignee.getEmail() != null) {
                        dashboardEmailService.sendTaskAssignedNotification(
                            assignee.getEmail(),
                            assignee.getFullName(),
                            saved.getTitle(),
                            saved.getCode(),
                            projectName,
                            saved.getPriority() != null ? saved.getPriority().name() : "MEDIUM",
                            saved.getDueDate(),
                            createdBy.getFullName(),
                            saved.getId()
                        );
                        logger.info("Task assignment notification sent to: {}", assignee.getEmail());
                    }
                } catch (Exception e) {
                    logger.error("Failed to send task assignment notification to {}: {}", assignee.getEmail(), e.getMessage(), e);
                }
            }
        }
        
        return mapToResponse(saved);
    }

    public TaskResponse updateTask(Long id, TaskRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        // Get current user to check admin role
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // Check if user is system admin
        boolean isAdmin = currentUser.getRole() != null && 
                         currentUser.getRole().getType() != null &&
                         currentUser.getRole().getType() == RoleType.ADMIN;

        // Check if user is project admin of the task's project
        boolean isProjectAdmin = false;
        Project taskProject = task.getProject();
        if (taskProject != null && taskProject.getProjectAdmin() != null && 
            taskProject.getProjectAdmin().getId().equals(currentUserId)) {
            isProjectAdmin = true;
        }
        
        // Also check if updating to a different project
        Project newProject = null;
        if (request.getProjectId() != null) {
            newProject = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
            if (newProject.getProjectAdmin() != null && 
                newProject.getProjectAdmin().getId().equals(currentUserId)) {
                isProjectAdmin = true;
            }
        }

        // If user is admin or project admin, allow update regardless of general permissions
        // Otherwise, check standard permissions
        if (!isAdmin && !isProjectAdmin) {
            // Check if user has update permission
            String updatePermission = permissionService.getModulePermission(currentUserId, "Tasks", "update");
            if ("None".equals(updatePermission)) {
                throw new ForbiddenException("You do not have permission to update tasks");
            }
            
            // If permission is "Added" or "Owned", check ownership
            if (!"All".equals(updatePermission)) {
                Long createdBy = task.getCreatedBy() != null ? task.getCreatedBy().getId() : null;
                Long assignedTo = task.getAssignedTo() != null ? task.getAssignedTo().getId() : null;
                
                boolean canAccess = permissionService.canAccessItem(
                        currentUserId, "Tasks", "update",
                        createdBy, assignedTo, null
                );
                if (!canAccess) {
                    throw new ForbiddenException("You do not have permission to update this task");
                }
            }
        }

        // Only update fields that are provided (not null) to avoid overwriting with null values
        if (request.getTitle() != null) {
            task.setTitle(request.getTitle());
        }
        if (request.getDescription() != null) {
            task.setDescription(request.getDescription());
        }
        if (request.getStartDate() != null) {
            task.setStartDate(request.getStartDate());
        }
        if (request.getDueDate() != null) {
            task.setDueDate(request.getDueDate());
        }
        if (request.getEstimatedHours() != null) {
            task.setEstimatedHours(request.getEstimatedHours());
        }

        if (request.getStatus() != null) {
            TaskStatus status = TaskStatus.valueOf(request.getStatus().toUpperCase());
            task.setStatus(status);
            if (status == TaskStatus.COMPLETED && task.getCompletedOn() == null) {
                task.setCompletedOn(LocalDateTime.now());
            }
        }

        if (request.getPriority() != null) {
            task.setPriority(resolvePriority(request.getPriority()));
        }

        if (request.getPinned() != null) {
            task.setPinned(request.getPinned());
        }

        // Handle assignees - prefer assignedToIds, fall back to assignedToId for backward compatibility
        if (request.getAssignedToIds() != null && !request.getAssignedToIds().isEmpty()) {
            java.util.List<Long> assigneeIds = request.getAssignedToIds();
            java.util.List<User> assignees = userRepository.findAllById(assigneeIds);
            if (assignees.size() != assigneeIds.size()) {
                throw new ResourceNotFoundException("One or more assigned users not found");
            }
            
            // If user is project admin (but not system admin), validate that all assigned users are project members
            // System admins can assign to anyone
            Project projectToCheck = newProject != null ? newProject : taskProject;
            if (isProjectAdmin && !isAdmin && projectToCheck != null) {
                java.util.Set<Long> projectMemberIds = new java.util.HashSet<>();
                if (projectToCheck.getMembers() != null) {
                    projectToCheck.getMembers().forEach(member -> projectMemberIds.add(member.getId()));
                }
                if (projectToCheck.getProjectAdmin() != null) {
                    projectMemberIds.add(projectToCheck.getProjectAdmin().getId());
                }
                
                for (User assignee : assignees) {
                    if (!projectMemberIds.contains(assignee.getId())) {
                        throw new ForbiddenException("You can only assign tasks to project members");
                    }
                }
            }
            
            task.setAssignees(assignees);
            task.setAssignedTo(assignees.get(0)); // Primary assignee for backward compatibility
        } else if (request.getAssignedToId() != null) {
            User assignedTo = userRepository.findById(request.getAssignedToId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assigned user not found"));
            
            // If user is project admin (but not system admin), validate that assigned user is a project member
            // System admins can assign to anyone
            Project projectToCheck = newProject != null ? newProject : taskProject;
            if (isProjectAdmin && !isAdmin && projectToCheck != null) {
                boolean isProjectMember = projectToCheck.getMembers() != null && 
                        projectToCheck.getMembers().stream()
                                .anyMatch(member -> member.getId().equals(request.getAssignedToId()));
                boolean isAssignedToProjectAdmin = projectToCheck.getProjectAdmin() != null && 
                        projectToCheck.getProjectAdmin().getId().equals(request.getAssignedToId());
                
                if (!isProjectMember && !isAssignedToProjectAdmin) {
                    throw new ForbiddenException("You can only assign tasks to project members");
                }
            }
            
            task.setAssignedTo(assignedTo);
            // Use mutable ArrayList instead of Collections.singletonList() to avoid UnsupportedOperationException
            java.util.List<User> assigneesList = new java.util.ArrayList<>();
            assigneesList.add(assignedTo);
            task.setAssignees(assigneesList);
        }

        if (newProject != null) {
            task.setProject(newProject);
        }

        if (request.getCategoryId() != null) {
            TaskCategory category = taskCategoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Task category not found"));
            task.setCategory(category);
        }

        Task updated = taskRepository.save(task);
        return mapToResponse(updated);
    }

    public TaskResponse getTaskById(Long id, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        // Check if user has view permission
        String viewPermission = permissionService.getModulePermission(currentUserId, "Tasks", "view");
        if ("None".equals(viewPermission)) {
            throw new ForbiddenException("You do not have permission to view tasks");
        }

        // If "All" permission, allow access
        if ("All".equals(viewPermission)) {
            return mapToResponse(task);
        }

        // For other permissions, check ownership
        Long createdBy = task.getCreatedBy() != null ? task.getCreatedBy().getId() : null;
        Long assignedTo = task.getAssignedTo() != null ? task.getAssignedTo().getId() : null;
        
        boolean canAccess = permissionService.canAccessItem(
                currentUserId, "Tasks", "view",
                createdBy, assignedTo, null
        );
        
        if (!canAccess) {
            throw new ForbiddenException("You do not have permission to view this task");
        }

        return mapToResponse(task);
    }

    public List<TaskResponse> getAllTasks(Long currentUserId) {
        if (currentUserId == null) {
            return new java.util.ArrayList<>();
        }

        String viewPermission = permissionService.getModulePermission(currentUserId, "Tasks", "view");
        
        // If no permission, return empty list
        if ("None".equals(viewPermission)) {
            return new java.util.ArrayList<>();
        }
        
        // If "All" permission, return all tasks
        if ("All".equals(viewPermission)) {
            return taskRepository.findAll().stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }
        
        // Filter based on permission level
        List<Task> allTasks = taskRepository.findAll();
        
        return allTasks.stream()
                .filter(task -> {
                    Long createdBy = task.getCreatedBy() != null ? task.getCreatedBy().getId() : null;
                    Long assignedTo = task.getAssignedTo() != null ? task.getAssignedTo().getId() : null;
                    
                    return permissionService.canAccessItem(
                            currentUserId, "Tasks", "view",
                            createdBy, assignedTo, null
                    );
                })
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<TaskResponse> getTasksByUserId(Long userId) {
        return taskRepository.findByAssignedToId(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<TaskResponse> getTasksByProject(Long projectId) {
        return taskRepository.findByProjectIdOrderByPinnedDescDueDateAsc(projectId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void deleteTask(Long id, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        // Check if user has delete permission
        String deletePermission = permissionService.getModulePermission(currentUserId, "Tasks", "delete");
        if ("None".equals(deletePermission)) {
            throw new ForbiddenException("You do not have permission to delete tasks");
        }

        // If permission is "Added" or "Owned", check ownership
        if (!"All".equals(deletePermission)) {
            Long createdBy = task.getCreatedBy() != null ? task.getCreatedBy().getId() : null;
            Long assignedTo = task.getAssignedTo() != null ? task.getAssignedTo().getId() : null;
            
            boolean canAccess = permissionService.canAccessItem(
                    currentUserId, "Tasks", "delete",
                    createdBy, assignedTo, null
            );
            if (!canAccess) {
                throw new ForbiddenException("You do not have permission to delete this task");
            }
        }

        taskRepository.deleteById(id);
    }

    private String generateTaskCode() {
        return "TASK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private TaskResponse mapToResponse(Task task) {
        TaskResponse response = new TaskResponse();
        response.setId(task.getId());
        response.setCode(task.getCode());
        response.setTitle(task.getTitle());
        response.setDescription(task.getDescription());
        response.setStatus(task.getStatus().name());
        response.setPriority(task.getPriority().name());
        response.setPinned(task.getPinned());
        // Primary assignee for backward compatibility
        if (task.getAssignedTo() != null) {
            response.setAssignedToId(task.getAssignedTo().getId());
            response.setAssignedToName(task.getAssignedTo().getFullName());
            response.setAssignedToAvatar(com.dashboard.app.util.FileUrlUtil.convertFilePathToUrl(task.getAssignedTo().getProfilePictureUrl()));
        }
        
        // Multiple assignees
        if (task.getAssignees() != null && !task.getAssignees().isEmpty()) {
            response.setAssignedToIds(task.getAssignees().stream()
                    .map(User::getId)
                    .collect(java.util.stream.Collectors.toList()));
            response.setAssignedToNames(task.getAssignees().stream()
                    .map(User::getFullName)
                    .collect(java.util.stream.Collectors.toList()));
        } else if (task.getAssignedTo() != null) {
            // Fallback: if assignees list is empty but assignedTo exists, use it
            response.setAssignedToIds(java.util.Collections.singletonList(task.getAssignedTo().getId()));
            response.setAssignedToNames(java.util.Collections.singletonList(task.getAssignedTo().getFullName()));
        }
        response.setProjectId(task.getProject() != null ? task.getProject().getId() : null);
        response.setProjectName(task.getProject() != null ? task.getProject().getName() : null);
        response.setCategoryId(task.getCategory() != null ? task.getCategory().getId() : null);
        response.setCategoryName(task.getCategory() != null ? task.getCategory().getName() : null);
        response.setStartDate(task.getStartDate());
        response.setDueDate(task.getDueDate());
        response.setCompletedOn(task.getCompletedOn());
        response.setEstimatedHours(task.getEstimatedHours());
        response.setHoursLogged(task.getHoursLogged());
        response.setAttachmentName(task.getAttachmentName());
        response.setAttachmentUrl(com.dashboard.app.util.FileUrlUtil.convertFilePathToUrl(task.getAttachmentPath()));
        response.setCreatedAt(task.getCreatedAt());
        response.setCreatedById(task.getCreatedBy() != null ? task.getCreatedBy().getId() : null);
        response.setCreatedByName(task.getCreatedBy() != null ? task.getCreatedBy().getFullName() : null);
        response.setCreatedByAvatar(task.getCreatedBy() != null ? com.dashboard.app.util.FileUrlUtil.convertFilePathToUrl(task.getCreatedBy().getProfilePictureUrl()) : null);
        return response;
    }

    private TaskStatus resolveStatus(String status) {
        if (status == null || status.isBlank()) {
            return TaskStatus.PENDING;
        }
        return TaskStatus.valueOf(status.toUpperCase());
    }

    private TaskPriority resolvePriority(String priority) {
        if (priority == null || priority.isBlank()) {
            return TaskPriority.MEDIUM;
        }
        return TaskPriority.valueOf(priority.toUpperCase());
    }
}

