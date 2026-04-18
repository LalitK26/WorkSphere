package com.dashboard.app.repository;

import com.dashboard.app.model.Role;
import com.dashboard.app.model.enums.RoleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(String name);
    List<Role> findByType(RoleType type);
    boolean existsByName(String name);
    
    /**
     * Find all dashboard roles (ADMIN, EMPLOYEE, CLIENT) with users and permissions eagerly loaded using JOIN FETCH.
     * This prevents LazyInitializationException and excludes recruitment roles.
     */
    @Query("SELECT DISTINCT r FROM Role r " +
           "LEFT JOIN FETCH r.users " +
           "LEFT JOIN FETCH r.permissions " +
           "WHERE r.type IN ('ADMIN', 'EMPLOYEE', 'CLIENT')")
    List<Role> findAllDashboardRolesWithUsersAndPermissions();
    
    /**
     * Find all roles with users and permissions eagerly loaded using JOIN FETCH.
     * This prevents LazyInitializationException in production environments.
     * @deprecated Use findAllDashboardRolesWithUsersAndPermissions() instead to exclude recruitment roles
     */
    @Query("SELECT DISTINCT r FROM Role r " +
           "LEFT JOIN FETCH r.users " +
           "LEFT JOIN FETCH r.permissions")
    @Deprecated
    List<Role> findAllWithUsersAndPermissions();
    
    /**
     * Alternative method using EntityGraph for eager loading - only dashboard roles.
     * Falls back to this if JOIN FETCH has issues.
     */
    @EntityGraph(attributePaths = {"users", "permissions"})
    @Query("SELECT r FROM Role r WHERE r.type IN ('ADMIN', 'EMPLOYEE', 'CLIENT')")
    List<Role> findAllDashboardRolesWithEntityGraph();
    
    /**
     * Alternative method using EntityGraph for eager loading.
     * Falls back to this if JOIN FETCH has issues.
     * @deprecated Use findAllDashboardRolesWithEntityGraph() instead to exclude recruitment roles
     */
    @EntityGraph(attributePaths = {"users", "permissions"})
    @Query("SELECT r FROM Role r")
    @Deprecated
    List<Role> findAllWithEntityGraph();
    
    /**
     * Count users by role ID
     */
    @Query("SELECT COUNT(u) FROM User u WHERE u.role.id = :roleId")
    long countUsersByRoleId(@org.springframework.data.repository.query.Param("roleId") Long roleId);
    
    /**
     * Find all roles with permissions only (no users) for better performance.
     * Member count will be calculated using count query instead of loading all users.
     * This is optimized for large user datasets (500+ employees).
     */
    @Query("SELECT DISTINCT r FROM Role r LEFT JOIN FETCH r.permissions")
    List<Role> findAllWithPermissionsOnly();
}

