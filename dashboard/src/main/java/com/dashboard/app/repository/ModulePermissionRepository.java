package com.dashboard.app.repository;

import com.dashboard.app.model.ModulePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ModulePermissionRepository extends JpaRepository<ModulePermission, Long> {
    List<ModulePermission> findByRoleId(Long roleId);
    Optional<ModulePermission> findByRoleIdAndModule(Long roleId, String module);
    
    // Case-insensitive lookup for module names (handles variations like "Shift Roster" vs "shift roster")
    @Query("SELECT mp FROM ModulePermission mp WHERE mp.role.id = :roleId AND LOWER(TRIM(mp.module)) = LOWER(TRIM(:module))")
    Optional<ModulePermission> findByRoleIdAndModuleIgnoreCase(@Param("roleId") Long roleId, @Param("module") String module);
    
    void deleteByRoleId(Long roleId);
}

