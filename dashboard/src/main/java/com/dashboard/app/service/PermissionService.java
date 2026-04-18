package com.dashboard.app.service;

import com.dashboard.app.model.ModulePermission;
import com.dashboard.app.model.User;
import com.dashboard.app.model.enums.RoleType;
import com.dashboard.app.repository.ModulePermissionRepository;
import com.dashboard.app.repository.UserRepository;
import jakarta.persistence.PersistenceException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.InvalidDataAccessResourceUsageException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class PermissionService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ModulePermissionRepository modulePermissionRepository;

    /**
     * Get the permission value for a specific module and action for a user
     * @param userId The user ID
     * @param moduleName The module name (e.g., "Employees", "Projects")
     * @param action The action (e.g., "add", "view", "update", "delete")
     * @return The permission value: "All", "Added", "Owned", "Added & Owned", or "None"
     */
    public String getModulePermission(Long userId, String moduleName, String action) {
        if (userId == null) {
            return "None";
        }

        // Use findWithRoleById to eagerly load the role relationship and avoid lazy initialization issues
        User user = userRepository.findWithRoleById(userId)
                .orElse(null);
        
        if (user == null || user.getRole() == null) {
            return "None";
        }

        // Admin always has "All" permissions
        if (user.getRole().getType() == RoleType.ADMIN) {
            return "All";
        }

        Long roleId = user.getRole().getId();
        
        try {
            // Use case-insensitive lookup to handle module name variations
            // This fixes issues where module names might have different casing in the database
            Optional<ModulePermission> modulePermission = modulePermissionRepository.findByRoleIdAndModuleIgnoreCase(roleId, moduleName);
            if (modulePermission.isPresent()) {
                ModulePermission perm = modulePermission.get();
                String permissionValue = null;
                
                switch (action.toLowerCase()) {
                    case "add":
                        permissionValue = perm.getAdd();
                        break;
                    case "view":
                        permissionValue = perm.getView();
                        break;
                    case "update":
                        permissionValue = perm.getUpdate();
                        break;
                    case "delete":
                        permissionValue = perm.getDelete();
                        break;
                    default:
                        return "None";
                }
                
                return permissionValue != null ? permissionValue : "None";
            }
        } catch (InvalidDataAccessResourceUsageException | PersistenceException e) {
            // Table doesn't exist yet
            return "None";
        }

        return "None";
    }

    /**
     * Check if user has "All" permission for a module action
     */
    public boolean hasAllPermission(Long userId, String moduleName, String action) {
        return "All".equals(getModulePermission(userId, moduleName, action));
    }

    /**
     * Check if user has any permission (not "None") for a module action
     */
    public boolean hasAnyPermission(Long userId, String moduleName, String action) {
        String permission = getModulePermission(userId, moduleName, action);
        return !"None".equals(permission);
    }

    /**
     * Check if user can access an item based on permission level
     * @param userId The user ID
     * @param moduleName The module name
     * @param action The action (view, update, delete)
     * @param itemCreatedBy The ID of the user who created the item (null if not applicable)
     * @param itemAssignedTo The ID of the user assigned to the item (null if not applicable)
     * @param itemMemberIds List of user IDs who are members/assigned to the item (null if not applicable)
     * @return true if user can access the item, false otherwise
     */
    public boolean canAccessItem(Long userId, String moduleName, String action, 
                                 Long itemCreatedBy, Long itemAssignedTo, List<Long> itemMemberIds) {
        String permission = getModulePermission(userId, moduleName, action);
        
        if ("None".equals(permission)) {
            return false;
        }
        
        if ("All".equals(permission)) {
            return true;
        }
        
        boolean isCreatedBy = itemCreatedBy != null && itemCreatedBy.equals(userId);
        boolean isAssignedTo = itemAssignedTo != null && itemAssignedTo.equals(userId);
        boolean isMember = itemMemberIds != null && itemMemberIds.contains(userId);
        boolean isOwned = isAssignedTo || isMember;
        
        if ("Added".equals(permission)) {
            return isCreatedBy;
        }
        
        if ("Owned".equals(permission)) {
            return isOwned;
        }
        
        if ("Added & Owned".equals(permission) || "Added & Owned".equals(permission)) {
            return isCreatedBy || isOwned;
        }
        
        return false;
    }
}

