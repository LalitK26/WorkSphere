package com.dashboard.app.repository;

import com.dashboard.app.model.Project;
import com.dashboard.app.model.enums.ProjectStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    Optional<Project> findByCode(String code);
    List<Project> findByStatus(ProjectStatus status);
    List<Project> findByClientId(Long clientId);
    List<Project> findByCreatedById(Long userId);
    boolean existsByCode(String code);
    List<Project> findByPinnedTrue();

    @Query("""
            SELECT DISTINCT p FROM Project p
            LEFT JOIN p.members m
            WHERE m.id = :userId
               OR p.projectAdmin.id = :userId
               OR p.createdBy.id = :userId
            """)
    List<Project> findVisibleProjectsForUser(@Param("userId") Long userId);
}

