package com.dashboard.app.recruitment.service;

import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.recruitment.dto.request.RecruitmentRoleRequest;
import com.dashboard.app.recruitment.dto.response.RecruitmentRoleResponse;
import com.dashboard.app.recruitment.model.RecruitmentRole;
import com.dashboard.app.recruitment.model.enums.RecruitmentRoleType;
import com.dashboard.app.recruitment.repository.RecruitmentRoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class RecruitmentRoleService {

    private static final Logger logger = LoggerFactory.getLogger(RecruitmentRoleService.class);

    @Autowired
    private RecruitmentRoleRepository recruitmentRoleRepository;

    @Transactional
    public RecruitmentRoleResponse createRecruitmentRole(RecruitmentRoleRequest request) {
        if (recruitmentRoleRepository.existsByName(request.getName())) {
            throw new BadRequestException("Role name already exists");
        }

        RecruitmentRole role = new RecruitmentRole();
        role.setName(request.getName());
        role.setDescription(request.getDescription());
        
        // Only allow recruitment role types
        if (request.getType() != null && !request.getType().isEmpty()) {
            RecruitmentRoleType requestedType = RecruitmentRoleType.valueOf(request.getType().toUpperCase());
            role.setType(requestedType);
        } else {
            // Default to RECRUITER if not specified
            role.setType(RecruitmentRoleType.RECRUITER);
        }

        RecruitmentRole saved = recruitmentRoleRepository.save(role);
        logger.info("Created recruitment role: {}", saved.getName());
        return mapToResponse(saved);
    }

    @Transactional
    public RecruitmentRoleResponse updateRecruitmentRole(Long id, RecruitmentRoleRequest request) {
        RecruitmentRole role = recruitmentRoleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recruitment role not found"));

        if (!role.getName().equals(request.getName()) && recruitmentRoleRepository.existsByName(request.getName())) {
            throw new BadRequestException("Role name already exists");
        }

        // Prevent updating Recruitment Admin role name
        if (role.getType() == RecruitmentRoleType.RECRUITMENT_ADMIN && !role.getName().equals(request.getName())) {
            throw new BadRequestException("Recruitment Admin role name cannot be changed");
        }

        // Prevent updating Candidate role name
        if (role.getType() == RecruitmentRoleType.CANDIDATE && !role.getName().equals(request.getName())) {
            throw new BadRequestException("Candidate role name cannot be changed");
        }

        role.setName(request.getName());
        role.setDescription(request.getDescription());
        
        if (request.getType() != null && !request.getType().isEmpty()) {
            RecruitmentRoleType requestedType = RecruitmentRoleType.valueOf(request.getType().toUpperCase());
            role.setType(requestedType);
        }

        RecruitmentRole updated = recruitmentRoleRepository.save(role);
        logger.info("Updated recruitment role: {}", updated.getName());
        return mapToResponse(updated);
    }

    @Transactional(readOnly = true)
    public RecruitmentRoleResponse getRecruitmentRoleById(Long id) {
        RecruitmentRole role = recruitmentRoleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recruitment role not found"));
        
        // Initialize lazy collections within transaction
        if (role.getRecruitmentUsers() != null) {
            role.getRecruitmentUsers().size();
        }
        if (role.getCandidates() != null) {
            role.getCandidates().size();
        }
        
        return mapToResponse(role);
    }

    @Transactional(readOnly = true)
    public List<RecruitmentRoleResponse> getAllRecruitmentRoles() {
        try {
            logger.debug("Fetching all recruitment roles");
            
            List<RecruitmentRole> roles = recruitmentRoleRepository.findAllWithUsersAndPermissions();
            
            // Map to response
            return roles.stream()
                    .map(role -> {
                        try {
                            // Initialize lazy collections
                            if (role.getRecruitmentUsers() != null) {
                                role.getRecruitmentUsers().size();
                            }
                            if (role.getCandidates() != null) {
                                role.getCandidates().size();
                            }
                            return mapToResponse(role);
                        } catch (Exception e) {
                            logger.error("Error mapping recruitment role {} to response: {}", role.getId(), e.getMessage(), e);
                            // Return a minimal response
                            RecruitmentRoleResponse response = new RecruitmentRoleResponse();
                            response.setId(role.getId());
                            response.setName(role.getName());
                            response.setType(role.getType() != null ? role.getType().name() : "UNKNOWN");
                            response.setDescription(role.getDescription());
                            response.setMemberCount(0L);
                            response.setCreatedAt(role.getCreatedAt());
                            return response;
                        }
                    })
                    .collect(Collectors.toList());
                    
        } catch (Exception e) {
            logger.error("Error in getAllRecruitmentRoles: {}", e.getMessage(), e);
            // Fallback to basic findAll
            List<RecruitmentRole> roles = recruitmentRoleRepository.findAll();
            return roles.stream()
                    .map(role -> {
                        try {
                            if (role.getRecruitmentUsers() != null) {
                                role.getRecruitmentUsers().size();
                            }
                            if (role.getCandidates() != null) {
                                role.getCandidates().size();
                            }
                            return mapToResponse(role);
                        } catch (Exception ex) {
                            logger.error("Error mapping role: {}", ex.getMessage());
                            RecruitmentRoleResponse response = new RecruitmentRoleResponse();
                            response.setId(role.getId());
                            response.setName(role.getName());
                            response.setType(role.getType() != null ? role.getType().name() : "UNKNOWN");
                            response.setDescription(role.getDescription());
                            response.setMemberCount(0L);
                            response.setCreatedAt(role.getCreatedAt());
                            return response;
                        }
                    })
                    .collect(Collectors.toList());
        }
    }

    @Transactional
    public void deleteRecruitmentRole(Long id) {
        RecruitmentRole role = recruitmentRoleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recruitment role not found"));
        
        // Prevent deletion of Recruitment Admin role
        if (role.getType() == RecruitmentRoleType.RECRUITMENT_ADMIN) {
            throw new BadRequestException("Recruitment Admin role cannot be deleted");
        }
        
        // Prevent deletion of Candidate role
        if (role.getType() == RecruitmentRoleType.CANDIDATE) {
            throw new BadRequestException("Candidate role cannot be deleted");
        }
        
        // Check if role has users
        long userCount = 0;
        if (role.getRecruitmentUsers() != null) {
            userCount += role.getRecruitmentUsers().size();
        }
        if (role.getCandidates() != null) {
            userCount += role.getCandidates().size();
        }
        
        if (userCount > 0) {
            throw new BadRequestException("Cannot delete role with assigned users");
        }
        
        recruitmentRoleRepository.deleteById(id);
        logger.info("Deleted recruitment role: {}", role.getName());
    }

    private RecruitmentRoleResponse mapToResponse(RecruitmentRole role) {
        RecruitmentRoleResponse response = new RecruitmentRoleResponse();
        response.setId(role.getId());
        response.setName(role.getName());
        response.setType(role.getType() != null ? role.getType().name() : "UNKNOWN");
        response.setDescription(role.getDescription());
        
        // Calculate member count (recruitment users + candidates)
        long memberCount = 0L;
        try {
            if (role.getRecruitmentUsers() != null) {
                memberCount += role.getRecruitmentUsers().size();
            }
            if (role.getCandidates() != null) {
                memberCount += role.getCandidates().size();
            }
        } catch (Exception e) {
            logger.debug("Error calculating member count for role {}: {}", role.getId(), e.getMessage());
            // If lazy loading fails, we'll use 0 as fallback
            memberCount = 0L;
        }
        
        response.setMemberCount(memberCount);
        response.setCreatedAt(role.getCreatedAt());
        return response;
    }
}

