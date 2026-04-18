package com.dashboard.app.config;

import com.dashboard.app.model.ModulePermission;
import com.dashboard.app.model.Permission;
import com.dashboard.app.model.Role;
import com.dashboard.app.model.User;
import com.dashboard.app.model.enums.RoleType;
import com.dashboard.app.model.enums.UserStatus;
import com.dashboard.app.repository.ModulePermissionRepository;
import com.dashboard.app.repository.PermissionRepository;
import com.dashboard.app.repository.RoleRepository;
import com.dashboard.app.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ModulePermissionRepository modulePermissionRepository;

    private boolean initialized = false;

    @Override
    @Transactional
    public void run(String... args) {
        // Initialization will happen via ContextRefreshedEvent
        // This ensures JPA has created all tables first
    }

    @EventListener
    public void onApplicationEvent(ContextRefreshedEvent event) {
        if (!initialized) {
            try {
                logger.info("Starting data initialization...");
                initializeRolesAndPermissions();
                initializeAdminUser();
                initialized = true;
                logger.info("Data initialization completed successfully");
            } catch (Exception e) {
                logger.error("Error initializing data", e);
                // Retry initialization on next event if tables don't exist yet
                String errorMsg = e.getMessage();
                Throwable cause = e.getCause();
                while (cause != null) {
                    errorMsg = cause.getMessage();
                    cause = cause.getCause();
                }
                if (errorMsg != null && (errorMsg.contains("doesn't exist") || 
                    (errorMsg.contains("Table") && errorMsg.contains("not found")))) {
                    logger.warn("Tables may not exist yet. Will retry on next startup.");
                    // Don't set initialized = true, so it will retry
                } else {
                    // For other errors, mark as initialized to prevent infinite retries
                    initialized = true;
                }
            }
        }
    }

    @Transactional
    private void initializeRolesAndPermissions() {
        // Create permissions
        String[][] permissionData = {
            {"tasks.view", "tasks", "View tasks"},
            {"tasks.create", "tasks", "Create tasks"},
            {"tasks.update", "tasks", "Update tasks"},
            {"tasks.assign", "tasks", "Assign tasks"},
            {"tasks.delete", "tasks", "Delete tasks"},
            {"projects.view", "projects", "View projects"},
            {"projects.create", "projects", "Create projects"},
            {"projects.update", "projects", "Update projects"},
            {"projects.assign", "projects", "Assign projects"},
            {"projects.delete", "projects", "Delete projects"},
            {"employees.view", "hr", "View employees"},
            {"employees.create", "hr", "Create employees"},
            {"employees.update", "hr", "Update employees"},
            {"employees.delete", "hr", "Delete employees"},
            {"attendance.view", "hr", "View attendance"},
            {"attendance.create", "hr", "Mark attendance"},
            {"attendance.update", "hr", "Update attendance"},
            {"designations.view", "hr", "View designations"},
            {"designations.create", "hr", "Create designations"},
            {"designations.update", "hr", "Update designations"},
            {"designations.delete", "hr", "Delete designations"},
            {"roles.view", "hr", "View roles"},
            {"roles.create", "hr", "Create roles"},
            {"roles.update", "hr", "Update roles"},
            {"roles.delete", "hr", "Delete roles"}
        };

        List<Permission> allPermissionsList = new ArrayList<>();
        for (String[] data : permissionData) {
            Permission permission = permissionRepository.findByName(data[0])
                .orElseGet(() -> {
                    Permission p = new Permission();
                    p.setName(data[0]);
                    p.setModule(data[1]);
                    p.setDescription(data[2]);
                    return permissionRepository.save(p);
                });
            allPermissionsList.add(permission);
        }
        
        // Convert to Set after all permissions are loaded
        Set<Permission> allPermissions = new HashSet<>();
        for (Permission p : allPermissionsList) {
            allPermissions.add(p);
        }

        // Create Admin Role - ensure it always exists
        Role adminRole = roleRepository.findByName("Admin")
            .orElse(null);
        
        if (adminRole == null) {
            // Try to find by type
            adminRole = roleRepository.findByType(RoleType.ADMIN)
                .stream()
                .findFirst()
                .orElse(null);
        }
        
        if (adminRole == null) {
            // Create new Admin role
            adminRole = new Role();
            adminRole.setName("Admin");
            adminRole.setType(RoleType.ADMIN);
            adminRole.setDescription("Administrator role with full access");
            adminRole.setPermissions(new HashSet<>());
            adminRole = roleRepository.save(adminRole);
            logger.info("Created Admin role");
        } else {
            // Ensure Admin role has correct name and type
            if (!"Admin".equals(adminRole.getName())) {
                adminRole.setName("Admin");
            }
            if (adminRole.getType() != RoleType.ADMIN) {
                adminRole.setType(RoleType.ADMIN);
            }
        }
        
        adminRole.setPermissions(allPermissions);
        adminRole = roleRepository.save(adminRole);
        logger.info("Admin role initialized with {} permissions", adminRole.getPermissions().size());

        // Create Employee Role with limited permissions - ensure it always exists
        Role employeeRole = roleRepository.findByName("Employee")
            .orElse(null);
        
        if (employeeRole == null) {
            // Try to find by type and name
            employeeRole = roleRepository.findByType(RoleType.EMPLOYEE)
                .stream()
                .filter(r -> r.getName() != null && r.getName().equalsIgnoreCase("Employee"))
                .findFirst()
                .orElse(null);
        }
        
        if (employeeRole == null) {
            // Create new Employee role
            employeeRole = new Role();
            employeeRole.setName("Employee");
            employeeRole.setType(RoleType.EMPLOYEE);
            employeeRole.setDescription("Employee role with limited access");
            employeeRole.setPermissions(new HashSet<>());
            employeeRole = roleRepository.save(employeeRole);
            logger.info("Created Employee role");
        } else {
            // Ensure Employee role has correct name and type
            if (!"Employee".equals(employeeRole.getName())) {
                employeeRole.setName("Employee");
            }
            if (employeeRole.getType() != RoleType.EMPLOYEE) {
                employeeRole.setType(RoleType.EMPLOYEE);
            }
        }

        List<Permission> employeePermissionsList = new ArrayList<>();
        String[] employeePermissionNames = {
            "tasks.view", "tasks.update", "projects.view", 
            "attendance.view", "attendance.create"
        };
        for (String permName : employeePermissionNames) {
            allPermissionsList.stream()
                .filter(p -> p.getName().equals(permName))
                .findFirst()
                .ifPresent(employeePermissionsList::add);
        }
        Set<Permission> employeePermissions = new HashSet<>(employeePermissionsList);
        employeeRole.setPermissions(employeePermissions);
        roleRepository.save(employeeRole);
        
        // Initialize module permissions for Employee role (default permissions)
        // Use separate transaction to avoid rollback if table doesn't exist yet
        initializeEmployeeModulePermissions(employeeRole);
        
        // Initialize module permissions for Admin role (all permissions)
        initializeAdminModulePermissions(adminRole);
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = Exception.class)
    private void initializeEmployeeModulePermissions(Role employeeRole) {
        // Default Employee permissions - limited access
        String[][] employeeModulePermissions = {
            {"Employees", "None", "None", "None", "None"},
            {"Projects", "None", "Owned", "Added & Owned", "None"},
            {"Tasks", "None", "Added & Owned", "Added & Owned", "None"},
            {"Attendance", "None", "Added & Owned", "None", "None"},
            {"Tickets", "Added", "Added & Owned", "Added", "None"},
            {"Events", "None", "All", "None", "None"},
            {"Leaves", "Added", "Added & Owned", "None", "None"},
            {"Holidays", "None", "All", "None", "None"},
            {"Department", "None", "All", "None", "None"},
            {"Designations", "None", "All", "None", "None"},
            {"Shift Roster", "None", "All", "None", "None"}
        };
        
        // Check if table exists by trying to query it
        try {
            // Try a simple query to see if table exists
            modulePermissionRepository.findAll().size();
        } catch (Exception e) {
            // Check if error is about table not existing
            String errorMsg = e.getMessage();
            Throwable cause = e.getCause();
            while (cause != null) {
                errorMsg = cause.getMessage();
                cause = cause.getCause();
            }
            if (errorMsg != null && (errorMsg.contains("doesn't exist") || errorMsg.contains("Table") && errorMsg.contains("not found"))) {
                logger.debug("Table module_permissions does not exist yet. Module permissions will be initialized on next startup.");
                return;
            }
            // If it's a different error, log and return anyway to avoid transaction rollback
            logger.warn("Error checking module_permissions table: {}", e.getMessage());
            return;
        }
        
        for (String[] perm : employeeModulePermissions) {
            try {
                ModulePermission existing = modulePermissionRepository
                        .findByRoleIdAndModule(employeeRole.getId(), perm[0])
                        .orElse(null);
                
                if (existing == null) {
                    ModulePermission modulePermission = new ModulePermission();
                    modulePermission.setRole(employeeRole);
                    modulePermission.setModule(perm[0]);
                    modulePermission.setAdd(perm[1]);
                    modulePermission.setView(perm[2]);
                    modulePermission.setUpdate(perm[3]);
                    modulePermission.setDelete(perm[4]);
                    modulePermissionRepository.save(modulePermission);
                } else {
                    // Update existing if needed
                    existing.setAdd(perm[1]);
                    existing.setView(perm[2]);
                    existing.setUpdate(perm[3]);
                    existing.setDelete(perm[4]);
                    modulePermissionRepository.save(existing);
                }
            } catch (Exception e) {
                // Log and continue with next permission
                logger.warn("Error creating module permission for {}: {}", perm[0], e.getMessage());
            }
        }
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = Exception.class)
    private void initializeAdminModulePermissions(Role adminRole) {
        // Admin has all permissions
        String[] modules = {
            "Employees", "Projects", "Tasks", "Attendance", "Tickets", 
            "Events", "Leaves", "Holidays", "Department", "Designations", "Shift Roster"
        };
        
        // Check if table exists by trying to query it
        try {
            // Try a simple query to see if table exists
            modulePermissionRepository.findAll().size();
        } catch (Exception e) {
            // Check if error is about table not existing
            String errorMsg = e.getMessage();
            Throwable cause = e.getCause();
            while (cause != null) {
                errorMsg = cause.getMessage();
                cause = cause.getCause();
            }
            if (errorMsg != null && (errorMsg.contains("doesn't exist") || errorMsg.contains("Table") && errorMsg.contains("not found"))) {
                logger.debug("Table module_permissions does not exist yet. Module permissions will be initialized on next startup.");
                return;
            }
            // If it's a different error, log and return anyway to avoid transaction rollback
            logger.warn("Error checking module_permissions table: {}", e.getMessage());
            return;
        }
        
        for (String module : modules) {
            try {
                ModulePermission existing = modulePermissionRepository
                        .findByRoleIdAndModule(adminRole.getId(), module)
                        .orElse(null);
                
                if (existing == null) {
                    ModulePermission modulePermission = new ModulePermission();
                    modulePermission.setRole(adminRole);
                    modulePermission.setModule(module);
                    modulePermission.setAdd("All");
                    modulePermission.setView("All");
                    modulePermission.setUpdate("All");
                    modulePermission.setDelete("All");
                    modulePermissionRepository.save(modulePermission);
                } else {
                    // Update existing if needed
                    existing.setAdd("All");
                    existing.setView("All");
                    existing.setUpdate("All");
                    existing.setDelete("All");
                    modulePermissionRepository.save(existing);
                }
            } catch (Exception e) {
                // Log and continue with next permission
                logger.warn("Error creating module permission for {}: {}", module, e.getMessage());
            }
        }
    }

    @Transactional
    private void initializeAdminUser() {
        Role adminRole = roleRepository.findByType(RoleType.ADMIN)
            .stream()
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Admin role not found"));

        User admin = userRepository.findByEmail("admin@dashboard.com")
            .orElseGet(() -> {
                User newAdmin = new User();
                newAdmin.setEmail("admin@dashboard.com");
                newAdmin.setFirstName("Admin");
                newAdmin.setLastName("User");
                newAdmin.setEmployeeId("ADMIN001");
                newAdmin.setRole(adminRole);
                newAdmin.setStatus(UserStatus.ACTIVE);
                return newAdmin;
            });

        // Always reset password to ensure it's correct
        admin.setPassword(passwordEncoder.encode("superadmin123"));
        admin.setRole(adminRole);
        admin.setStatus(UserStatus.ACTIVE);
        
        userRepository.save(admin);
        logger.info("Admin user initialized successfully");
    }
}

