package com.dashboard.app.repository;

import com.dashboard.app.model.Task;
import com.dashboard.app.model.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByAssignedToId(Long userId);
    List<Task> findByProjectId(Long projectId);
    List<Task> findByStatus(TaskStatus status);
    List<Task> findByAssignedToIdAndStatus(Long userId, TaskStatus status);
    List<Task> findByDueDateBeforeAndStatusNot(LocalDate date, TaskStatus status);
    boolean existsByCode(String code);
    
    @Query("SELECT t FROM Task t WHERE t.assignedTo.id = :userId AND t.status != :status")
    List<Task> findActiveTasksByUserId(@Param("userId") Long userId, @Param("status") TaskStatus status);

    long countByProjectId(Long projectId);

    long countByProjectIdAndStatus(Long projectId, TaskStatus status);

    List<Task> findByProjectIdOrderByPinnedDescDueDateAsc(Long projectId);
}

