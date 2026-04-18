package com.dashboard.app.repository;

import com.dashboard.app.model.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {
    Optional<Department> findByName(String name);
    List<Department> findByParentDepartmentId(Long parentId);
    List<Department> findByParentDepartmentIsNull();
    List<Department> findByNameContainingIgnoreCase(String name);
    boolean existsByName(String name);
}



