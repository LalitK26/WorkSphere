package com.dashboard.app.repository;

import com.dashboard.app.model.Designation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DesignationRepository extends JpaRepository<Designation, Long> {
    Optional<Designation> findByName(String name);
    List<Designation> findByParentDesignationId(Long parentId);
    List<Designation> findByParentDesignationIsNull();
    List<Designation> findByNameContainingIgnoreCase(String name);
    boolean existsByName(String name);
}

