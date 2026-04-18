package com.dashboard.app.recruitment.repository;

import com.dashboard.app.recruitment.model.RecruitmentRole;
import com.dashboard.app.recruitment.model.enums.RecruitmentRoleType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecruitmentRoleRepository extends JpaRepository<RecruitmentRole, Long> {
    Optional<RecruitmentRole> findByName(String name);
    List<RecruitmentRole> findByType(RecruitmentRoleType type);
    boolean existsByName(String name);
    
    /**
     * Find all recruitment roles with users eagerly loaded using JOIN FETCH.
     */
    @Query("SELECT DISTINCT r FROM RecruitmentRole r " +
           "LEFT JOIN FETCH r.recruitmentUsers")
    List<RecruitmentRole> findAllWithUsersAndPermissions();
    
    /**
     * Alternative method using EntityGraph for eager loading.
     */
    @EntityGraph(attributePaths = {"recruitmentUsers"})
    @Query("SELECT r FROM RecruitmentRole r")
    List<RecruitmentRole> findAllWithEntityGraph();
    
    /**
     * Count recruitment users by role ID
     */
    @Query("SELECT COUNT(u) FROM RecruitmentUser u WHERE u.role.id = :roleId")
    long countRecruitmentUsersByRoleId(@org.springframework.data.repository.query.Param("roleId") Long roleId);
}

