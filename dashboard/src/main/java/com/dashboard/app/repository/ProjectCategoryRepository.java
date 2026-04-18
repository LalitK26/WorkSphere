package com.dashboard.app.repository;

import com.dashboard.app.model.ProjectCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProjectCategoryRepository extends JpaRepository<ProjectCategory, Long> {
    Optional<ProjectCategory> findByNameIgnoreCase(String name);
}

