package com.dashboard.app.service;

import com.dashboard.app.dto.request.EmployeeRequest;
import com.dashboard.app.dto.response.EmployeeResponse;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ForbiddenException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.Designation;
import com.dashboard.app.model.Role;
import com.dashboard.app.model.Task;
import com.dashboard.app.model.User;
import com.dashboard.app.model.enums.UserStatus;
import com.dashboard.app.repository.AttendanceRepository;
import com.dashboard.app.repository.DesignationRepository;
import com.dashboard.app.repository.LeaveRepository;
import com.dashboard.app.repository.ProjectCategoryRepository;
import com.dashboard.app.repository.ProjectRepository;
import com.dashboard.app.repository.RoleRepository;
import com.dashboard.app.repository.ShiftAssignmentRepository;
import com.dashboard.app.repository.TaskCategoryRepository;
import com.dashboard.app.repository.TaskRepository;
import com.dashboard.app.repository.TicketActivityRepository;
import com.dashboard.app.repository.TicketReplyRepository;
import com.dashboard.app.repository.TicketRepository;
import com.dashboard.app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class EmployeeService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private DesignationRepository designationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private ShiftAssignmentRepository shiftAssignmentRepository;

    @Autowired
    private LeaveRepository leaveRepository;

    @Autowired
    private TicketReplyRepository ticketReplyRepository;

    @Autowired
    private TicketActivityRepository ticketActivityRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private TaskCategoryRepository taskCategoryRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ProjectCategoryRepository projectCategoryRepository;

    @Autowired
    private com.dashboard.app.service.PermissionService permissionService;

    @Autowired
    private FileStorageService fileStorageService;

    @CacheEvict(value = "employees", allEntries = true)
    public EmployeeResponse createEmployee(EmployeeRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        // Check if user has add permission
        String addPermission = permissionService.getModulePermission(currentUserId, "Employees", "add");
        if ("None".equals(addPermission)) {
            throw new ForbiddenException("You do not have permission to create employees");
        }

        // If permission is "Added" or "Owned", user can only create employees for themselves (doesn't apply to employees module)
        // For Employees module, "All" permission allows creating any employee
        if (!"All".equals(addPermission)) {
            // For "Added" or "Owned", we might want to restrict, but Employees module typically needs "All" for creation
            // This can be customized based on business requirements
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already exists");
        }

        if (request.getEmployeeId() != null && userRepository.existsByEmployeeId(request.getEmployeeId())) {
            throw new BadRequestException("Employee ID already exists");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmployeeId(request.getEmployeeId());
        // Set default password if not provided or empty
        String password = (request.getPassword() != null && !request.getPassword().trim().isEmpty()) 
                ? request.getPassword() 
                : "password123";
        user.setPassword(passwordEncoder.encode(password));
        user.setStatus(request.getStatus() != null ? UserStatus.valueOf(request.getStatus()) : UserStatus.ACTIVE);

        if (request.getRoleId() != null) {
            Role role = roleRepository.findById(request.getRoleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
            user.setRole(role);
        } else {
            Role defaultRole = roleRepository.findByType(com.dashboard.app.model.enums.RoleType.EMPLOYEE)
                    .stream().findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Default EMPLOYEE role not found"));
            user.setRole(defaultRole);
        }

        if (request.getDesignationId() != null) {
            Designation designation = designationRepository.findById(request.getDesignationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Designation not found"));
            user.setDesignation(designation);
        }

        if (request.getReportingManagerId() != null) {
            User manager = userRepository.findById(request.getReportingManagerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Reporting manager not found"));
            user.setReportingManager(manager);
        }

        applyExtendedFields(user, request);

        User savedUser = userRepository.save(user);
        return mapToResponse(savedUser);
    }

    @CacheEvict(value = "employees", allEntries = true)
    public EmployeeResponse updateEmployee(Long id, EmployeeRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        // Always allow users to update their own profile, regardless of permissions
        boolean isUpdatingSelf = id.equals(currentUserId);
        
        if (!isUpdatingSelf) {
            // Check if user has update permission for other employees
            String updatePermission = permissionService.getModulePermission(currentUserId, "Employees", "update");
            if ("None".equals(updatePermission)) {
                throw new ForbiddenException("You do not have permission to update employees");
            }

            // If permission is "Added" or "Owned", check ownership
            if (!"All".equals(updatePermission)) {
                throw new ForbiddenException("You do not have permission to update this employee");
            }
        }

        if (!user.getEmail().equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already exists");
        }

        user.setEmail(request.getEmail());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());

        // When updating self, restrict sensitive fields
        if (!isUpdatingSelf) {
            if (request.getEmployeeId() != null) {
                if (!user.getEmployeeId().equals(request.getEmployeeId()) && 
                    userRepository.existsByEmployeeId(request.getEmployeeId())) {
                    throw new BadRequestException("Employee ID already exists");
                }
                user.setEmployeeId(request.getEmployeeId());
            }

            if (request.getRoleId() != null) {
                Role role = roleRepository.findById(request.getRoleId())
                        .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
                user.setRole(role);
            }

            if (request.getDesignationId() != null) {
                Designation designation = designationRepository.findById(request.getDesignationId())
                        .orElseThrow(() -> new ResourceNotFoundException("Designation not found"));
                user.setDesignation(designation);
            }

            if (request.getReportingManagerId() != null) {
                User manager = userRepository.findById(request.getReportingManagerId())
                        .orElseThrow(() -> new ResourceNotFoundException("Reporting manager not found"));
                user.setReportingManager(manager);
            }

            if (request.getStatus() != null) {
                user.setStatus(UserStatus.valueOf(request.getStatus()));
            }
        }
        // When updating self, allow password change
        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        applyExtendedFields(user, request);

        User updatedUser = userRepository.save(user);
        return mapToResponse(updatedUser);
    }

    public EmployeeResponse getEmployeeById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));
        return mapToResponse(user);
    }

    @Cacheable(value = "employees", key = "#currentUserId + '_all'")
    public List<EmployeeResponse> getAllEmployees(Long currentUserId) {
        if (currentUserId == null) {
            return new ArrayList<>();
        }

        String viewPermission = permissionService.getModulePermission(currentUserId, "Employees", "view");
        String shiftRosterAddPermission = permissionService.getModulePermission(currentUserId, "Shift Roster", "add");
        String shiftRosterUpdatePermission = permissionService.getModulePermission(currentUserId, "Shift Roster", "update");
        
        // Allow access if user has Employees view permission OR Shift Roster add/update permission
        // This allows shift assignment even without Employees view permission
        boolean hasEmployeesPermission = !"None".equals(viewPermission);
        boolean hasShiftRosterPermission = !"None".equals(shiftRosterAddPermission) || !"None".equals(shiftRosterUpdatePermission);
        boolean hasFullAccess = "All".equals(viewPermission) || hasShiftRosterPermission;
        
        // OPTIMIZED: Use EntityGraph to avoid N+1 queries
        // Always return employee list to all authenticated users (for birthday feature)
        // But apply field filtering based on permissions to protect sensitive data
        if (hasFullAccess) {
            // Users with "All" permission or Shift Roster permission get full employee data
            return userRepository.findAllWithRelations().stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        } else {
            // Users without full access get limited employee data (for birthdays and basic info)
            // This includes: name, dateOfBirth, designation, profilePictureUrl, and basic fields
            return userRepository.findAllWithRelations().stream()
                    .map(user -> mapToLimitedResponse(user))
                    .collect(Collectors.toList());
        }
    }

    /**
     * Get employees with pagination support (optimized for large datasets)
     * This method is backward compatible and can be used alongside getAllEmployees()
     * Cached for 5 minutes to improve performance with large datasets
     */
    @Cacheable(value = "employees", key = "#currentUserId + '_paginated_' + #page + '_' + #size + '_' + (#search != null ? #search : '')")
    public Map<String, Object> getAllEmployeesPaginated(Long currentUserId, int page, int size, String search) {
        if (currentUserId == null) {
            return Map.of("content", List.of(), "totalElements", 0L, "totalPages", 0, "currentPage", page, "size", size);
        }

        String viewPermission = permissionService.getModulePermission(currentUserId, "Employees", "view");
        String shiftRosterAddPermission = permissionService.getModulePermission(currentUserId, "Shift Roster", "add");
        String shiftRosterUpdatePermission = permissionService.getModulePermission(currentUserId, "Shift Roster", "update");
        
        boolean hasFullAccess = "All".equals(viewPermission) || 
                               !"None".equals(shiftRosterAddPermission) || 
                               !"None".equals(shiftRosterUpdatePermission);
        
        Pageable pageable = PageRequest.of(page, size, Sort.by("firstName").ascending());
        
        // Use optimized query with EntityGraph to avoid N+1 queries
        Page<User> userPage;
        if (search != null && !search.trim().isEmpty()) {
            // For search, we need to use specification but still get relations
            // Note: EntityGraph with Specification requires custom implementation
            // For now, we'll use regular findAll and then fetch relations for the page
            String trimmedSearch = search.trim().toLowerCase();
            String searchPattern = "%" + trimmedSearch + "%";
            Specification<User> spec = (root, query, cb) -> {
                // Search in firstName, lastName, concatenated fullName, email, employeeId
                // Case-insensitive search using LOWER() function
                // Also search in concatenated firstName + " " + lastName for full name matching
                return cb.or(
                    cb.like(cb.lower(root.get("firstName")), searchPattern),
                    cb.like(cb.lower(root.get("lastName")), searchPattern),
                    cb.like(
                        cb.lower(
                            cb.concat(
                                cb.concat(root.get("firstName"), " "),
                                root.get("lastName")
                            )
                        ), 
                        searchPattern
                    ),
                    cb.like(cb.lower(root.get("email")), searchPattern),
                    cb.like(cb.lower(root.get("employeeId")), searchPattern)
                );
            };
            userPage = userRepository.findAll(spec, pageable);
            // Fetch relations for the current page
            List<Long> userIds = userPage.getContent().stream().map(User::getId).collect(Collectors.toList());
            Map<Long, User> userMap = userRepository.findAllByIdWithRelations(
                new java.util.HashSet<>(userIds)
            ).stream().collect(Collectors.toMap(User::getId, u -> u));
            
            // Replace content with users that have relations loaded
            List<User> usersWithRelations = userPage.getContent().stream()
                .map(u -> userMap.getOrDefault(u.getId(), u))
                .collect(Collectors.toList());
            
            List<EmployeeResponse> content = usersWithRelations.stream()
                    .map(hasFullAccess ? this::mapToResponse : this::mapToLimitedResponse)
                    .collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("content", content);
            response.put("totalElements", userPage.getTotalElements());
            response.put("totalPages", userPage.getTotalPages());
            response.put("currentPage", page);
            response.put("size", size);
            return response;
        } else {
            // No search - use optimized EntityGraph method
            userPage = userRepository.findAllWithRelations(pageable);
            
            List<EmployeeResponse> content = userPage.getContent().stream()
                    .map(hasFullAccess ? this::mapToResponse : this::mapToLimitedResponse)
                    .collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("content", content);
            response.put("totalElements", userPage.getTotalElements());
            response.put("totalPages", userPage.getTotalPages());
            response.put("currentPage", page);
            response.put("size", size);
            return response;
        }
    }

    @CacheEvict(value = "employees", allEntries = true)
    public void deleteEmployee(Long id, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        // Check if user has delete permission
        String deletePermission = permissionService.getModulePermission(currentUserId, "Employees", "delete");
        if ("None".equals(deletePermission)) {
            throw new ForbiddenException("You do not have permission to delete employees");
        }

        // If permission is "Added" or "Owned", check ownership
        if (!"All".equals(deletePermission)) {
            // For Employees module, typically only "All" permission allows deletion
            // Users with "Added" or "Owned" cannot delete employees
            throw new ForbiddenException("You do not have permission to delete employees");
        }

        // Delete related records
        attendanceRepository.deleteByUserId(id);
        shiftAssignmentRepository.deleteByUserId(id);
        leaveRepository.deleteByUserId(id);
        
        // Delete tickets where user is requester (tickets cascade delete replies, activities, and files)
        ticketRepository.deleteByRequesterId(id);
        
        // Delete ticket replies and activities where user is the user (for tickets they didn't create)
        // Note: This handles cases where user replied to or had activities on other users' tickets
        ticketReplyRepository.deleteByUserId(id);
        ticketActivityRepository.deleteByUserId(id);
        
        // Update tickets where user is assigned agent
        ticketRepository.findByAssignedAgentId(id).forEach(ticket -> {
            ticket.setAssignedAgent(null);
            ticketRepository.save(ticket);
        });
        
        // Update task categories where user is creator
        taskCategoryRepository.findAll().forEach(category -> {
            if (category.getCreatedBy() != null && category.getCreatedBy().getId().equals(id)) {
                category.setCreatedBy(null);
                taskCategoryRepository.save(category);
            }
        });
        
        // Update project categories where user is creator
        projectCategoryRepository.findAll().forEach(category -> {
            if (category.getCreatedBy() != null && category.getCreatedBy().getId().equals(id)) {
                category.setCreatedBy(null);
                projectCategoryRepository.save(category);
            }
        });
        
        // Remove user from task assignees (many-to-many relationship)
        taskRepository.findAll().forEach(task -> {
            boolean modified = false;
            // Remove user from assignees list by filtering out the user with matching ID
            if (task.getAssignees() != null) {
                int originalSize = task.getAssignees().size();
                task.setAssignees(task.getAssignees().stream()
                        .filter(assignee -> !assignee.getId().equals(id))
                        .collect(Collectors.toList()));
                if (task.getAssignees().size() != originalSize) {
                    modified = true;
                }
            }
            // Also handle the single assignedTo field for backward compatibility
            if (task.getAssignedTo() != null && task.getAssignedTo().getId().equals(id)) {
                // If there are other assignees, use the first one
                if (task.getAssignees() != null && !task.getAssignees().isEmpty()) {
                    task.setAssignedTo(task.getAssignees().get(0));
                } else {
                    // Try to find an admin user to reassign
                    User adminUser = userRepository.findAll().stream()
                            .filter(u -> u.getRole() != null && 
                                    u.getRole().getType() != null && 
                                    u.getRole().getType() == com.dashboard.app.model.enums.RoleType.ADMIN &&
                                    !u.getId().equals(id))
                            .findFirst()
                            .orElse(null);
                    if (adminUser != null) {
                        task.setAssignedTo(adminUser);
                        if (task.getAssignees() == null) {
                            task.setAssignees(new java.util.ArrayList<>());
                        }
                        task.getAssignees().add(adminUser);
                    } else {
                        task.setAssignedTo(null);
                    }
                }
                modified = true;
            }
            // Update tasks where user is creator
            if (task.getCreatedBy() != null && task.getCreatedBy().getId().equals(id)) {
                task.setCreatedBy(null);
                modified = true;
            }
            if (modified) {
                taskRepository.save(task);
            }
        });
        
        // Update projects where user is creator
        projectRepository.findByCreatedById(id).forEach(project -> {
            project.setCreatedBy(null);
            projectRepository.save(project);
        });
        
        // Update projects where user is admin - need to query manually
        projectRepository.findAll().forEach(project -> {
            if (project.getProjectAdmin() != null && project.getProjectAdmin().getId().equals(id)) {
                project.setProjectAdmin(null);
                projectRepository.save(project);
            }
            // Remove user from project members
            if (project.getMembers() != null && project.getMembers().contains(user)) {
                project.getMembers().remove(user);
                projectRepository.save(project);
            }
        });
        
        // Update users where this user is reporting manager
        userRepository.findByReportingManagerId(id).forEach(subordinate -> {
            subordinate.setReportingManager(null);
            userRepository.save(subordinate);
        });

        userRepository.delete(user);
    }

    private EmployeeResponse mapToResponse(User user) {
        EmployeeResponse response = new EmployeeResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setFullName(user.getFullName());
        response.setEmployeeId(user.getEmployeeId());
        response.setRoleId(user.getRole() != null ? user.getRole().getId() : null);
        response.setRoleName(user.getRole() != null ? user.getRole().getName() : null);
        response.setDesignationId(user.getDesignation() != null ? user.getDesignation().getId() : null);
        response.setDesignationName(user.getDesignation() != null ? user.getDesignation().getName() : null);
        response.setReportingManagerId(user.getReportingManager() != null ? user.getReportingManager().getId() : null);
        response.setReportingManagerName(user.getReportingManager() != null ? user.getReportingManager().getFullName() : null);
        response.setStatus(user.getStatus().name());
        response.setCreatedAt(user.getCreatedAt());

        // extended fields
        response.setDepartment(user.getDepartment());
        response.setCountry(user.getCountry());
        response.setMobile(user.getMobile());
        response.setGender(user.getGender());
        response.setJoiningDate(user.getJoiningDate());
        response.setDateOfBirth(user.getDateOfBirth());
        response.setLanguage(user.getLanguage());
        response.setAddress(user.getAddress());
        response.setAbout(user.getAbout());
        response.setLoginAllowed(user.getLoginAllowed());
        response.setReceiveEmailNotifications(user.getReceiveEmailNotifications());
        response.setHourlyRate(user.getHourlyRate());
        response.setSlackMemberId(user.getSlackMemberId());
        response.setSkills(user.getSkills());
        response.setProbationEndDate(user.getProbationEndDate());
        response.setNoticePeriodStartDate(user.getNoticePeriodStartDate());
        response.setNoticePeriodEndDate(user.getNoticePeriodEndDate());
        response.setEmploymentType(user.getEmploymentType());
        response.setMaritalStatus(user.getMaritalStatus());
        response.setInternshipEndDate(user.getInternshipEndDate());
        response.setBusinessAddress(user.getBusinessAddress());
        response.setExitDate(user.getExitDate());
        // Convert file path to API URL for frontend access
        response.setProfilePictureUrl(com.dashboard.app.util.FileUrlUtil.convertFilePathToUrl(user.getProfilePictureUrl()));
        return response;
    }

    /**
     * Map user to limited response containing only safe fields for non-admin users
     * Includes fields needed for birthday feature: name, dateOfBirth, designation, profilePictureUrl
     * Excludes sensitive fields: email, address, mobile, salary, etc.
     */
    private EmployeeResponse mapToLimitedResponse(User user) {
        EmployeeResponse response = new EmployeeResponse();
        // Basic identification fields (safe for all users)
        response.setId(user.getId());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setFullName(user.getFullName());
        
        // Fields needed for birthday feature
        response.setDateOfBirth(user.getDateOfBirth());
        response.setDesignationId(user.getDesignation() != null ? user.getDesignation().getId() : null);
        response.setDesignationName(user.getDesignation() != null ? user.getDesignation().getName() : null);
        response.setProfilePictureUrl(com.dashboard.app.util.FileUrlUtil.convertFilePathToUrl(user.getProfilePictureUrl()));
        
        // Role name for display purposes (role name is generally safe)
        response.setRoleName(user.getRole() != null ? user.getRole().getName() : null);
        
        // Joining date for anniversary feature
        response.setJoiningDate(user.getJoiningDate());
        
        // Status for filtering active employees
        response.setStatus(user.getStatus().name());
        
        // Sensitive fields are left null (email, address, mobile, hourlyRate, etc.)
        // These will not be serialized or will be null in the response
        
        return response;
    }

    private void applyExtendedFields(User user, EmployeeRequest request) {
        user.setDepartment(request.getDepartment());
        user.setCountry(request.getCountry());
        user.setMobile(request.getMobile());
        user.setGender(request.getGender());
        user.setLanguage(request.getLanguage());
        user.setAddress(request.getAddress());
        user.setAbout(request.getAbout());
        user.setLoginAllowed(request.getLoginAllowed() != null ? request.getLoginAllowed() : true);
        user.setReceiveEmailNotifications(
                request.getReceiveEmailNotifications() != null ? request.getReceiveEmailNotifications() : true);
        user.setHourlyRate(request.getHourlyRate());
        user.setSlackMemberId(request.getSlackMemberId());
        user.setSkills(request.getSkills());
        user.setEmploymentType(request.getEmploymentType());
        user.setMaritalStatus(request.getMaritalStatus());
        user.setBusinessAddress(request.getBusinessAddress());
        // Profile picture is now uploaded separately via uploadProfilePicture endpoint
        // Only set if explicitly provided (for backward compatibility during migration)
        if (request.getProfilePictureUrl() != null && !request.getProfilePictureUrl().isEmpty()) {
            user.setProfilePictureUrl(request.getProfilePictureUrl());
        }

        // parse dates from ISO strings if provided
        user.setJoiningDate(parseDate(request.getJoiningDate()));
        user.setDateOfBirth(parseDate(request.getDateOfBirth()));
        user.setProbationEndDate(parseDate(request.getProbationEndDate()));
        user.setNoticePeriodStartDate(parseDate(request.getNoticePeriodStartDate()));
        user.setNoticePeriodEndDate(parseDate(request.getNoticePeriodEndDate()));
        user.setInternshipEndDate(parseDate(request.getInternshipEndDate()));
        user.setExitDate(parseDate(request.getExitDate()));
    }

    private LocalDate parseDate(String value) {
        return (value == null || value.isEmpty()) ? null : LocalDate.parse(value);
    }


    /**
     * Upload profile picture for an employee
     */
    @CacheEvict(value = "employees", allEntries = true)
    public EmployeeResponse uploadProfilePicture(Long userId, org.springframework.web.multipart.MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        // Delete old profile picture if exists
        if (user.getProfilePictureUrl() != null && !user.getProfilePictureUrl().isEmpty()) {
            fileStorageService.deleteFile(user.getProfilePictureUrl());
        }

        // Upload new profile picture
        String filePath = fileStorageService.uploadProfileImage(file);
        user.setProfilePictureUrl(filePath);

        User updatedUser = userRepository.save(user);
        return mapToResponse(updatedUser);
    }
}

