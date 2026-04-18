package com.dashboard.app.service;

import com.dashboard.app.dto.request.ModulePermissionRequest;
import com.dashboard.app.dto.request.RolePermissionsRequest;
import com.dashboard.app.dto.request.RoleRequest;
import com.dashboard.app.dto.response.ModulePermissionResponse;
import com.dashboard.app.dto.response.RolePermissionsResponse;
import com.dashboard.app.dto.response.RoleResponse;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.ModulePermission;
import com.dashboard.app.model.Permission;
import com.dashboard.app.model.Role;
import com.dashboard.app.model.enums.RoleType;
import com.dashboard.app.repository.ModulePermissionRepository;
import com.dashboard.app.repository.PermissionRepository;
import com.dashboard.app.repository.RoleRepository;
import jakarta.persistence.PersistenceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.InvalidDataAccessResourceUsageException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class RoleService {

    private static final Logger logger = LoggerFactory.getLogger(RoleService.class);

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private ModulePermissionRepository modulePermissionRepository;

    @CacheEvict(value = "roles", allEntries = true)
    @Transactional
    public RoleResponse createRole(RoleRequest request) {
        if (roleRepository.existsByName(request.getName())) {
            throw new BadRequestException("Role name already exists");
        }

        Role role = new Role();
        role.setName(request.getName());
        role.setDescription(request.getDescription());
        if (request.getType() != null && !request.getType().isEmpty()) {
            try {
                RoleType requestedType = RoleType.valueOf(request.getType().toUpperCase());
                // Validate that only dashboard role types are allowed (ADMIN, EMPLOYEE, CLIENT)
                // Recruitment roles must be created in the recruitment_roles table
                if (requestedType != RoleType.ADMIN && 
                    requestedType != RoleType.EMPLOYEE && 
                    requestedType != RoleType.CLIENT) {
                    throw new BadRequestException("Invalid role type. Only dashboard role types (ADMIN, EMPLOYEE, CLIENT) are allowed. Recruitment roles must be created in the recruitment system.");
                }
                role.setType(requestedType);
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid role type: " + request.getType() + ". Only dashboard role types (ADMIN, EMPLOYEE, CLIENT) are allowed. Recruitment roles must be created in the recruitment system.");
            }
        } else {
            role.setType(RoleType.EMPLOYEE); // Default to EMPLOYEE type
        }

        if (request.getPermissionIds() != null && !request.getPermissionIds().isEmpty()) {
            Set<Permission> permissions = new HashSet<>(permissionRepository.findAllById(request.getPermissionIds()));
            role.setPermissions(permissions);
        }

        Role saved = roleRepository.save(role);
        
        // Don't initialize module permissions here - it will cause transaction rollback
        // Permissions can be initialized later when the table exists
        // The role is created successfully regardless
        
        return mapToResponse(saved);
    }

    @CacheEvict(value = "roles", allEntries = true)
    @Transactional
    public RoleResponse updateRole(Long id, RoleRequest request) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));

        // Check if this is the Employee role (by both type and name)
        boolean isEmployee = role.getType() == RoleType.EMPLOYEE && 
                            role.getName() != null && 
                            role.getName().equalsIgnoreCase("Employee");

        // Prevent updating Admin role name
        if (role.getType() == RoleType.ADMIN && !role.getName().equals(request.getName())) {
            throw new BadRequestException("Admin role name cannot be changed");
        }
        
        // Prevent updating Employee role name
        if (isEmployee && !role.getName().equals(request.getName())) {
            throw new BadRequestException("Employee role name cannot be changed");
        }

        if (!role.getName().equals(request.getName()) && roleRepository.existsByName(request.getName())) {
            throw new BadRequestException("Role name already exists");
        }

        role.setName(request.getName());
        role.setDescription(request.getDescription());
        if (request.getType() != null) {
            try {
                RoleType requestedType = RoleType.valueOf(request.getType().toUpperCase());
                // Validate that only dashboard role types are allowed (ADMIN, EMPLOYEE, CLIENT)
                // Recruitment roles must be managed in the recruitment_roles table
                if (requestedType != RoleType.ADMIN && 
                    requestedType != RoleType.EMPLOYEE && 
                    requestedType != RoleType.CLIENT) {
                    throw new BadRequestException("Invalid role type. Only dashboard role types (ADMIN, EMPLOYEE, CLIENT) are allowed. Recruitment roles must be managed in the recruitment system.");
                }
                // Prevent changing Admin or Employee role types
                if (role.getType() == RoleType.ADMIN && requestedType != RoleType.ADMIN) {
                    throw new BadRequestException("Admin role type cannot be changed");
                }
                if (isEmployee && requestedType != RoleType.EMPLOYEE) {
                    throw new BadRequestException("Employee role type cannot be changed");
                }
                role.setType(requestedType);
            } catch (IllegalArgumentException e) {
                throw new BadRequestException("Invalid role type: " + request.getType() + ". Only dashboard role types (ADMIN, EMPLOYEE, CLIENT) are allowed. Recruitment roles must be managed in the recruitment system.");
            }
        }

        if (request.getPermissionIds() != null) {
            Set<Permission> permissions = new HashSet<>(permissionRepository.findAllById(request.getPermissionIds()));
            role.setPermissions(permissions);
        }

        Role updated = roleRepository.save(role);
        return mapToResponse(updated);
    }

    @Transactional(readOnly = true)
    public RoleResponse getRoleById(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
        
        // Ensure this is a dashboard role (ADMIN, EMPLOYEE, CLIENT)
        // Recruitment roles should be accessed through the recruitment system
        if (role.getType() != RoleType.ADMIN && 
            role.getType() != RoleType.EMPLOYEE && 
            role.getType() != RoleType.CLIENT) {
            throw new ResourceNotFoundException("Role not found. This appears to be a recruitment role. Please use the recruitment system to access recruitment roles.");
        }
        
        // Initialize lazy collections within transaction
        if (role.getUsers() != null) {
            role.getUsers().size();
        }
        // Initialize permissions collection to avoid LazyInitializationException
        if (role.getPermissions() != null) {
            role.getPermissions().size();
        }
        return mapToResponse(role);
    }

    @Cacheable(value = "roles", key = "'all'")
    @Transactional(readOnly = true)
    public List<RoleResponse> getAllRoles() {
        try {
            logger.debug("Fetching all dashboard roles (ADMIN, EMPLOYEE, CLIENT) with users and permissions");
            
            // Try to use JOIN FETCH query first for better performance and reliability
            // Only fetch dashboard roles, exclude recruitment roles
            List<Role> roles;
            try {
                roles = roleRepository.findAllDashboardRolesWithUsersAndPermissions();
                logger.debug("Successfully fetched {} dashboard roles using JOIN FETCH", roles.size());
            } catch (Exception e) {
                // Fallback to EntityGraph if optimized query fails
                logger.warn("Optimized query failed, falling back to EntityGraph: {}", e.getMessage());
                try {
                    roles = roleRepository.findAllDashboardRolesWithEntityGraph();
                    logger.debug("Successfully fetched {} dashboard roles using EntityGraph", roles.size());
                } catch (Exception e2) {
                    // Last resort: use basic findByType for each valid dashboard role type
                    logger.warn("EntityGraph failed, using findByType for each dashboard role type: {}", e2.getMessage());
                    roles = new ArrayList<>();
                    for (RoleType type : Arrays.asList(RoleType.ADMIN, RoleType.EMPLOYEE, RoleType.CLIENT)) {
                        try {
                            List<Role> rolesByType = roleRepository.findByType(type);
                            // Initialize lazy collections for each role within transaction
                            for (Role role : rolesByType) {
                                try {
                                    // Initialize users collection to get member count
                                    if (role.getUsers() != null) {
                                        role.getUsers().size(); // Force lazy loading within transaction
                                    }
                                    // Initialize permissions collection to avoid LazyInitializationException
                                    if (role.getPermissions() != null) {
                                        role.getPermissions().size(); // Force lazy loading within transaction
                                    }
                                } catch (Exception initEx) {
                                    logger.warn("Failed to initialize lazy collections for role {}: {}", 
                                               role.getId(), initEx.getMessage());
                                    // Continue with other roles even if one fails
                                }
                            }
                            roles.addAll(rolesByType);
                        } catch (Exception typeEx) {
                            logger.warn("Failed to fetch roles for type {}: {}", type, typeEx.getMessage());
                            // Continue with other types even if one fails
                        }
                    }
                }
            }
            
            // Ensure Admin and Employee roles exist - if not, try to create them
            boolean hasAdmin = roles.stream().anyMatch(r -> r.getType() == RoleType.ADMIN && 
                                                           r.getName() != null && 
                                                           r.getName().equalsIgnoreCase("Admin"));
            boolean hasEmployee = roles.stream().anyMatch(r -> r.getType() == RoleType.EMPLOYEE && 
                                                              r.getName() != null && 
                                                              r.getName().equalsIgnoreCase("Employee"));
            
            if (!hasAdmin) {
                logger.warn("Admin role missing! Attempting to create it...");
                try {
                    Role adminRole = createDefaultAdminRole();
                    roles.add(adminRole);
                    logger.info("Created Admin role on-the-fly");
                } catch (Exception e) {
                    logger.error("Failed to create Admin role: {}", e.getMessage());
                }
            }
            
            if (!hasEmployee) {
                logger.warn("Employee role missing! Attempting to create it...");
                try {
                    Role employeeRole = createDefaultEmployeeRole();
                    roles.add(employeeRole);
                    logger.info("Created Employee role on-the-fly");
                } catch (Exception e) {
                    logger.error("Failed to create Employee role: {}", e.getMessage());
                }
            }
            
            // Re-check after potential creation
            hasAdmin = roles.stream().anyMatch(r -> r.getType() == RoleType.ADMIN && 
                                                   r.getName() != null && 
                                                   r.getName().equalsIgnoreCase("Admin"));
            hasEmployee = roles.stream().anyMatch(r -> r.getType() == RoleType.EMPLOYEE && 
                                                      r.getName() != null && 
                                                      r.getName().equalsIgnoreCase("Employee"));
            
            // Filter out any roles that don't have valid dashboard role types (safety check)
            List<Role> validDashboardRoles = roles.stream()
                    .filter(role -> {
                        if (role.getType() == null) {
                            logger.warn("Role {} has null type, excluding from results", role.getId());
                            return false;
                        }
                        // Only include ADMIN, EMPLOYEE, or CLIENT roles
                        boolean isValid = role.getType() == RoleType.ADMIN || 
                                         role.getType() == RoleType.EMPLOYEE || 
                                         role.getType() == RoleType.CLIENT;
                        if (!isValid) {
                            logger.debug("Excluding role {} with type {} (not a dashboard role)", role.getId(), role.getType());
                        }
                        return isValid;
                    })
                    .collect(Collectors.toList());
            
            // Re-check Admin and Employee after filtering
            hasAdmin = validDashboardRoles.stream().anyMatch(r -> r.getType() == RoleType.ADMIN && 
                                                                   r.getName() != null && 
                                                                   r.getName().equalsIgnoreCase("Admin"));
            hasEmployee = validDashboardRoles.stream().anyMatch(r -> r.getType() == RoleType.EMPLOYEE && 
                                                                      r.getName() != null && 
                                                                      r.getName().equalsIgnoreCase("Employee"));
            
            logger.info("Returning {} dashboard roles. Admin present: {}, Employee present: {}", 
                       validDashboardRoles.size(), hasAdmin, hasEmployee);
            
            // Map to response with error handling for each role
            return validDashboardRoles.stream()
                    .map(role -> {
                        try {
                            RoleResponse response = mapToResponse(role);
                            // OPTIMIZED: Always use count query for member count (faster than loading all users)
                            // This preserves the same logic but with better performance
                            try {
                                long memberCount = roleRepository.countUsersByRoleId(role.getId());
                                response.setMemberCount(memberCount);
                            } catch (Exception countEx) {
                                logger.debug("Could not get count from database for role {}: {}", role.getId(), countEx.getMessage());
                                // Fallback: try to get from loaded collection if available
                                if (role.getUsers() != null) {
                                    try {
                                        response.setMemberCount((long) role.getUsers().size());
                                    } catch (Exception e) {
                                        response.setMemberCount(0L);
                                    }
                                } else {
                                    response.setMemberCount(0L);
                                }
                            }
                            return response;
                        } catch (Exception e) {
                            logger.error("Error mapping role {} to response: {}", role.getId(), e.getMessage(), e);
                            // Return a minimal response to prevent complete failure
                            RoleResponse response = new RoleResponse();
                            response.setId(role.getId());
                            response.setName(role.getName());
                            response.setType(role.getType() != null ? role.getType().name() : "UNKNOWN");
                            response.setDescription(role.getDescription());
                            response.setPermissionIds(new ArrayList<>());
                            response.setPermissionNames(new ArrayList<>());
                            response.setMemberCount(0L);
                            response.setCreatedAt(role.getCreatedAt());
                            return response;
                        }
                    })
                    .collect(Collectors.toList());
                    
        } catch (Exception e) {
            logger.error("Critical error in getAllRoles: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to retrieve roles: " + e.getMessage(), e);
        }
    }

    @CacheEvict(value = "roles", allEntries = true)
    @Transactional
    public void deleteRole(Long id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
        
        // Ensure this is a dashboard role (ADMIN, EMPLOYEE, CLIENT)
        // Recruitment roles should be deleted through the recruitment system
        if (role.getType() != RoleType.ADMIN && 
            role.getType() != RoleType.EMPLOYEE && 
            role.getType() != RoleType.CLIENT) {
            throw new BadRequestException("Cannot delete recruitment role from dashboard system. Please use the recruitment system to manage recruitment roles.");
        }
        
        // Prevent deletion of Admin role (by type)
        boolean isAdmin = role.getType() == RoleType.ADMIN;
        if (isAdmin) {
            throw new BadRequestException("Admin role cannot be deleted");
        }
        
        // Prevent deletion of Employee role (check by both name and type to be safe)
        // Employee role should have type EMPLOYEE AND name "Employee"
        boolean isEmployee = role.getType() == RoleType.EMPLOYEE && 
                            role.getName() != null && 
                            role.getName().equalsIgnoreCase("Employee");
        if (isEmployee) {
            throw new BadRequestException("Employee role cannot be deleted");
        }
        
        // Check if role has users
        if (role.getUsers() != null && !role.getUsers().isEmpty()) {
            throw new BadRequestException("Cannot delete role with assigned users");
        }
        
        // Delete module permissions first
        modulePermissionRepository.deleteByRoleId(id);
        roleRepository.deleteById(id);
    }
    
    @Transactional(readOnly = true)
    public RolePermissionsResponse getRolePermissions(Long roleId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
        
        List<ModulePermission> modulePermissions;
        try {
            modulePermissions = modulePermissionRepository.findByRoleId(roleId);
        } catch (InvalidDataAccessResourceUsageException | PersistenceException e) {
            // Table doesn't exist yet, return empty permissions
            modulePermissions = new ArrayList<>();
        }
        List<ModulePermissionResponse> permissions = modulePermissions.stream()
                .map(this::mapToModulePermissionResponse)
                .collect(Collectors.toList());
        
        // Ensure all modules are present
        List<String> allModules = Arrays.asList(
            "Employees", "Projects", "Tasks", "Attendance", "Tickets", 
            "Events", "Leaves", "Holidays", "Department", "Designations", "Shift Roster"
        );
        
        for (String module : allModules) {
            boolean exists = permissions.stream().anyMatch(p -> p.getModule().equals(module));
            if (!exists) {
                ModulePermissionResponse defaultPerm = new ModulePermissionResponse();
                defaultPerm.setModule(module);
                defaultPerm.setAdd("None");
                defaultPerm.setView("None");
                defaultPerm.setUpdate("None");
                defaultPerm.setDelete("None");
                permissions.add(defaultPerm);
            }
        }
        
        // Sort by module name
        permissions.sort((a, b) -> a.getModule().compareTo(b.getModule()));
        
        RolePermissionsResponse response = new RolePermissionsResponse();
        response.setRoleId(role.getId());
        response.setRoleName(role.getName());
        response.setPermissions(permissions);
        return response;
    }
    
    @Transactional
    @CacheEvict(value = {"permissions", "shiftRoster"}, allEntries = true)
    public RolePermissionsResponse updateRolePermissions(Long roleId, RolePermissionsRequest request) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
        
        // Get existing permissions for this role
        List<ModulePermission> existingPermissions;
        try {
            existingPermissions = modulePermissionRepository.findByRoleId(roleId);
        } catch (InvalidDataAccessResourceUsageException | PersistenceException e) {
            // Table doesn't exist yet - that's okay, JPA will create it when we save
            existingPermissions = new ArrayList<>();
        }
        
        // Create a map of existing permissions by module name for quick lookup
        // Use case-insensitive comparison for module names
        Map<String, ModulePermission> existingMap = new HashMap<>();
        for (ModulePermission perm : existingPermissions) {
            String key = perm.getModule() != null ? perm.getModule().toLowerCase().trim() : "";
            existingMap.put(key, perm);
        }
        
        // Process each permission request - update existing or create new
        for (ModulePermissionRequest permRequest : request.getPermissions()) {
            // Use case-insensitive lookup
            String moduleKey = permRequest.getModule() != null ? permRequest.getModule().toLowerCase().trim() : "";
            ModulePermission modulePermission = existingMap.get(moduleKey);
            
            if (modulePermission != null) {
                // Update existing permission
                modulePermission.setAdd(permRequest.getAdd() != null ? permRequest.getAdd() : "None");
                modulePermission.setView(permRequest.getView() != null ? permRequest.getView() : "None");
                modulePermission.setUpdate(permRequest.getUpdate() != null ? permRequest.getUpdate() : "None");
                modulePermission.setDelete(permRequest.getDelete() != null ? permRequest.getDelete() : "None");
            } else {
                // Create new permission
                modulePermission = new ModulePermission();
                modulePermission.setRole(role);
                modulePermission.setModule(permRequest.getModule());
                modulePermission.setAdd(permRequest.getAdd() != null ? permRequest.getAdd() : "None");
                modulePermission.setView(permRequest.getView() != null ? permRequest.getView() : "None");
                modulePermission.setUpdate(permRequest.getUpdate() != null ? permRequest.getUpdate() : "None");
                modulePermission.setDelete(permRequest.getDelete() != null ? permRequest.getDelete() : "None");
            }
            
            modulePermissionRepository.save(modulePermission);
        }
        
        // Delete any permissions that are not in the request (if they exist)
        Set<String> requestedModules = request.getPermissions().stream()
                .map(perm -> perm.getModule() != null ? perm.getModule().toLowerCase().trim() : "")
                .collect(Collectors.toSet());
        
        for (ModulePermission existing : existingPermissions) {
            String existingModuleKey = existing.getModule() != null ? existing.getModule().toLowerCase().trim() : "";
            if (!requestedModules.contains(existingModuleKey)) {
                modulePermissionRepository.delete(existing);
            }
        }
        
        return getRolePermissions(roleId);
    }
    
    public void resetRolePermissions(Long roleId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
        
        // Find Employee role
        Role employeeRole = roleRepository.findByType(RoleType.EMPLOYEE)
                .stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Employee role not found"));
        
        // Copy permissions from Employee role
        copyModulePermissions(employeeRole.getId(), roleId);
    }
    
    public void importRolePermissions(Long roleId, Long sourceRoleId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
        
        Role sourceRole = roleRepository.findById(sourceRoleId)
                .orElseThrow(() -> new ResourceNotFoundException("Source role not found"));
        
        copyModulePermissions(sourceRoleId, roleId);
    }
    
    // Internal method called after role creation is committed
    private void initializeModulePermissionsForNewRoleInternal(RoleRequest request, Long roleId) {
        // Check if table exists first - catch exception to prevent transaction rollback
        try {
            // Try to query the table - if it doesn't exist, this will throw an exception
            modulePermissionRepository.findAll().size();
        } catch (Exception e) {
            // Check if error is about table not existing
            String errorMsg = e.getMessage();
            Throwable cause = e.getCause();
            while (cause != null) {
                errorMsg = cause.getMessage();
                cause = cause.getCause();
            }
            if (errorMsg != null && (errorMsg.contains("doesn't exist") || (errorMsg.contains("Table") && errorMsg.contains("not found")))) {
                logger.debug("Table module_permissions does not exist yet. Permissions will be initialized when table is created.");
                return; // Exit early - don't try to initialize permissions
            }
            // If it's a different error, log and return anyway
            logger.warn("Error checking module_permissions table: {}", e.getMessage());
            return; // Exit early on any error
        }
        
        // Table exists, proceed with initialization in a separate transaction
        // If importing from another role, copy module permissions
        if (request.getImportFromRoleId() != null) {
            try {
                copyModulePermissionsInNewTransaction(request.getImportFromRoleId(), roleId);
            } catch (Exception e) {
                logger.warn("Error copying module permissions: {}", e.getMessage());
            }
        } else {
            // Default: inherit from Employee role
            Role employeeRole = roleRepository.findByType(RoleType.EMPLOYEE)
                    .stream().findFirst()
                    .orElse(null);
            if (employeeRole != null) {
                try {
                    copyModulePermissionsInNewTransaction(employeeRole.getId(), roleId);
                } catch (Exception e) {
                    logger.warn("Error copying module permissions from Employee role: {}", e.getMessage());
                }
            } else {
                // If no Employee role exists, create default permissions
                try {
                    initializeDefaultModulePermissionsInNewTransaction(roleId);
                } catch (Exception e) {
                    logger.warn("Error initializing default module permissions: {}", e.getMessage());
                }
            }
        }
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    private void copyModulePermissionsInNewTransaction(Long sourceRoleId, Long targetRoleId) {
        copyModulePermissions(sourceRoleId, targetRoleId);
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    private void initializeDefaultModulePermissionsInNewTransaction(Long roleId) {
        initializeDefaultModulePermissions(roleId);
    }
    
    private void copyModulePermissions(Long sourceRoleId, Long targetRoleId) {
        List<ModulePermission> sourcePermissions;
        try {
            sourcePermissions = modulePermissionRepository.findByRoleId(sourceRoleId);
        } catch (InvalidDataAccessResourceUsageException | PersistenceException e) {
            // Table doesn't exist, nothing to copy
            sourcePermissions = new ArrayList<>();
        }
        
        if (sourcePermissions.isEmpty()) {
            // Nothing to copy, return early
            return;
        }
        
        Role targetRole = roleRepository.findById(targetRoleId)
                .orElseThrow(() -> new ResourceNotFoundException("Target role not found"));
        
        // Delete existing permissions
        try {
            modulePermissionRepository.deleteByRoleId(targetRoleId);
        } catch (InvalidDataAccessResourceUsageException | PersistenceException e) {
            // Table doesn't exist, nothing to delete
        }
        
        // Copy permissions
        for (ModulePermission sourcePerm : sourcePermissions) {
            ModulePermission newPerm = new ModulePermission();
            newPerm.setRole(targetRole);
            newPerm.setModule(sourcePerm.getModule());
            newPerm.setAdd(sourcePerm.getAdd());
            newPerm.setView(sourcePerm.getView());
            newPerm.setUpdate(sourcePerm.getUpdate());
            newPerm.setDelete(sourcePerm.getDelete());
            modulePermissionRepository.save(newPerm);
        }
    }
    
    private void initializeDefaultModulePermissions(Long roleId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found"));
        
        List<String> modules = Arrays.asList(
            "Employees", "Projects", "Tasks", "Attendance", "Tickets", 
            "Events", "Leaves", "Holidays", "Department", "Designations", "Shift Roster"
        );
        
        for (String module : modules) {
            ModulePermission modulePermission = new ModulePermission();
            modulePermission.setRole(role);
            modulePermission.setModule(module);
            modulePermission.setAdd("None");
            modulePermission.setView("None");
            modulePermission.setUpdate("None");
            modulePermission.setDelete("None");
            modulePermissionRepository.save(modulePermission);
        }
    }
    
    private ModulePermissionResponse mapToModulePermissionResponse(ModulePermission mp) {
        ModulePermissionResponse response = new ModulePermissionResponse();
        response.setModule(mp.getModule());
        response.setAdd(mp.getAdd());
        response.setView(mp.getView());
        response.setUpdate(mp.getUpdate());
        response.setDelete(mp.getDelete());
        return response;
    }

    private RoleResponse mapToResponse(Role role) {
        RoleResponse response = new RoleResponse();
        response.setId(role.getId());
        response.setName(role.getName());
        response.setType(role.getType().name());
        response.setDescription(role.getDescription());
        // Safely access permissions - should be initialized by caller
        if (role.getPermissions() != null && !role.getPermissions().isEmpty()) {
            response.setPermissionIds(role.getPermissions().stream().map(Permission::getId).collect(Collectors.toList()));
            response.setPermissionNames(role.getPermissions().stream().map(Permission::getName).collect(Collectors.toList()));
        } else {
            response.setPermissionIds(new ArrayList<>());
            response.setPermissionNames(new ArrayList<>());
        }
        
        // Calculate member count - try from loaded collection first, then use count query
        long memberCount = 0L;
        try {
            if (role.getUsers() != null) {
                // Try to get size from loaded collection
                memberCount = role.getUsers().size();
                // If size is 0 but we want to be sure, use count query as fallback
                // This handles cases where collection might not be fully loaded
                if (memberCount == 0) {
                    try {
                        long countFromDb = roleRepository.countUsersByRoleId(role.getId());
                        if (countFromDb > 0) {
                            memberCount = countFromDb;
                            logger.debug("Member count for role {} corrected from collection (0) to database count ({})", 
                                       role.getId(), countFromDb);
                        }
                    } catch (Exception e) {
                        logger.debug("Could not get count from database for role {}: {}", role.getId(), e.getMessage());
                        // Use 0 if count query fails
                    }
                }
            } else {
                // Collection is null, use count query
                try {
                    memberCount = roleRepository.countUsersByRoleId(role.getId());
                } catch (Exception e) {
                    logger.debug("Could not get count from database for role {}: {}", role.getId(), e.getMessage());
                    memberCount = 0L;
                }
            }
        } catch (Exception e) {
            // If accessing collection fails, use count query
            logger.debug("Error accessing users collection for role {}, using count query: {}", role.getId(), e.getMessage());
            try {
                memberCount = roleRepository.countUsersByRoleId(role.getId());
            } catch (Exception countEx) {
                logger.warn("Could not get member count for role {}: {}", role.getId(), countEx.getMessage());
                memberCount = 0L;
            }
        }
        
        response.setMemberCount(memberCount);
        response.setCreatedAt(role.getCreatedAt());
        return response;
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    private Role createDefaultAdminRole() {
        Role adminRole = new Role();
        adminRole.setName("Admin");
        adminRole.setType(RoleType.ADMIN);
        adminRole.setDescription("Administrator role with full access");
        adminRole.setPermissions(new HashSet<>());
        return roleRepository.save(adminRole);
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    private Role createDefaultEmployeeRole() {
        Role employeeRole = new Role();
        employeeRole.setName("Employee");
        employeeRole.setType(RoleType.EMPLOYEE);
        employeeRole.setDescription("Employee role with limited access");
        employeeRole.setPermissions(new HashSet<>());
        return roleRepository.save(employeeRole);
    }
}

