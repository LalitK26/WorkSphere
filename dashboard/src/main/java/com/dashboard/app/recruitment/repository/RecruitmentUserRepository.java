package com.dashboard.app.recruitment.repository;

import com.dashboard.app.recruitment.model.RecruitmentUser;
import com.dashboard.app.model.enums.UserStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecruitmentUserRepository extends JpaRepository<RecruitmentUser, Long> {
    Optional<RecruitmentUser> findByEmail(String email);
    
    @EntityGraph(attributePaths = {"role"})
    Optional<RecruitmentUser> findWithRoleByEmail(String email);
    
    @EntityGraph(attributePaths = {"role"})
    Optional<RecruitmentUser> findWithRoleById(Long id);
    
    List<RecruitmentUser> findByStatus(UserStatus status);
    boolean existsByEmail(String email);
}

