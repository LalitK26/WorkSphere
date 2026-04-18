package com.dashboard.app.repository;

import com.dashboard.app.model.User;
import com.dashboard.app.model.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    Optional<User> findByEmail(String email);
    
    @EntityGraph(attributePaths = {"role"})
    Optional<User> findWithRoleByEmail(String email);
    
    @EntityGraph(attributePaths = {"role"})
    Optional<User> findWithRoleById(Long id);
    
    // Optimized method with EntityGraph to avoid N+1 queries
    @EntityGraph(attributePaths = {"role", "designation", "reportingManager"})
    @Query("SELECT u FROM User u")
    Page<User> findAllWithRelations(Pageable pageable);
    
    // Optimized method for active users only
    @EntityGraph(attributePaths = {"role", "designation", "reportingManager"})
    @Query("SELECT u FROM User u WHERE u.status = :status")
    Page<User> findByStatusWithRelations(@Param("status") UserStatus status, Pageable pageable);
    
    // Get all users with relations (for backward compatibility, but optimized)
    @EntityGraph(attributePaths = {"role", "designation", "reportingManager"})
    @Query("SELECT u FROM User u")
    List<User> findAllWithRelations();
    
    // Get active user IDs only (for attendance processing)
    @Query("SELECT u.id FROM User u WHERE u.status = 'ACTIVE'")
    List<Long> findActiveUserIds();
    
    // Get users by IDs with relations (batch loading)
    @EntityGraph(attributePaths = {"role", "designation", "reportingManager"})
    @Query("SELECT u FROM User u WHERE u.id IN :ids")
    List<User> findAllByIdWithRelations(@Param("ids") Set<Long> ids);
    
    List<User> findByStatus(UserStatus status);
    List<User> findByRoleId(Long roleId);
    List<User> findByDesignationId(Long designationId);
    List<User> findByReportingManagerId(Long managerId);
    boolean existsByEmail(String email);
    boolean existsByEmployeeId(String employeeId);
    long countByDepartment(String department);
}

