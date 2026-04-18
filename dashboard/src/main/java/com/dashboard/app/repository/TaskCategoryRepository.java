package com.dashboard.app.repository;

import com.dashboard.app.model.TaskCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TaskCategoryRepository extends JpaRepository<TaskCategory, Long> {
    Optional<TaskCategory> findByNameIgnoreCase(String name);
}

