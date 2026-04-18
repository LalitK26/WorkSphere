package com.dashboard.app.recruitment.service;

import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.enums.UserStatus;
import com.dashboard.app.recruitment.dto.request.CreateRecruitmentUserRequest;
import com.dashboard.app.recruitment.dto.request.UpdateRecruitmentUserRequest;
import com.dashboard.app.recruitment.dto.response.RecruitmentUserResponse;
import com.dashboard.app.recruitment.model.RecruitmentRole;
import com.dashboard.app.recruitment.model.RecruitmentUser;
import com.dashboard.app.recruitment.model.enums.RecruitmentRoleType;
import com.dashboard.app.recruitment.repository.RecruitmentRoleRepository;
import com.dashboard.app.recruitment.repository.RecruitmentUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class RecruitmentUserService {

    @Autowired
    private RecruitmentUserRepository recruitmentUserRepository;

    @Autowired
    private RecruitmentRoleRepository recruitmentRoleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public RecruitmentUserResponse createRecruitmentUser(CreateRecruitmentUserRequest request) {
        // Check if email already exists in recruitment users
        if (recruitmentUserRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already exists");
        }

        // Check if email exists in candidates (we don't want duplicates across tables either)
        // We'll check this in the controller or add a method to check both

        RecruitmentUser user = new RecruitmentUser();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        
        // Parse status safely with default to ACTIVE
        try {
            if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
                user.setStatus(UserStatus.valueOf(request.getStatus().toUpperCase()));
            } else {
                user.setStatus(UserStatus.ACTIVE);
            }
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status. Must be ACTIVE or INACTIVE");
        }

        // Find role by type
        RecruitmentRoleType roleType;
        if ("RECRUITER".equalsIgnoreCase(request.getRole())) {
            roleType = RecruitmentRoleType.RECRUITER;
        } else if ("TECHNICAL_INTERVIEWER".equalsIgnoreCase(request.getRole())) {
            roleType = RecruitmentRoleType.TECHNICAL_INTERVIEWER;
        } else {
            throw new BadRequestException("Invalid role. Must be RECRUITER or TECHNICAL_INTERVIEWER");
        }

        RecruitmentRole role = recruitmentRoleRepository.findByType(roleType)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Role with type " + roleType + " not found. Please ensure the recruitment roles are initialized."));
        
        user.setRole(role);

        try {
            RecruitmentUser savedUser = recruitmentUserRepository.save(user);
            return mapToResponse(savedUser);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            if (e.getMessage() != null && e.getMessage().contains("email")) {
                throw new BadRequestException("Email already exists");
            }
            throw new BadRequestException("Failed to save user: " + (e.getCause() != null ? e.getCause().getMessage() : e.getMessage()));
        } catch (Exception e) {
            throw new BadRequestException("Failed to save user: " + (e.getCause() != null ? e.getCause().getMessage() : e.getMessage()));
        }
    }

    public RecruitmentUserResponse updateRecruitmentUser(Long id, UpdateRecruitmentUserRequest request) {
        RecruitmentUser user = recruitmentUserRepository.findWithRoleById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recruitment user not found"));

        // Check if email already exists (excluding current user)
        if (!user.getEmail().equals(request.getEmail()) && recruitmentUserRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already exists");
        }

        user.setName(request.getName());
        user.setEmail(request.getEmail());
        
        // Parse status safely with default to ACTIVE
        try {
            if (request.getStatus() != null && !request.getStatus().trim().isEmpty()) {
                user.setStatus(UserStatus.valueOf(request.getStatus().toUpperCase()));
            } else {
                user.setStatus(UserStatus.ACTIVE);
            }
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid status. Must be ACTIVE or INACTIVE");
        }

        // Update password only if provided
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        // Find role by type
        RecruitmentRoleType roleType;
        if ("RECRUITER".equalsIgnoreCase(request.getRole())) {
            roleType = RecruitmentRoleType.RECRUITER;
        } else if ("TECHNICAL_INTERVIEWER".equalsIgnoreCase(request.getRole())) {
            roleType = RecruitmentRoleType.TECHNICAL_INTERVIEWER;
        } else {
            throw new BadRequestException("Invalid role. Must be RECRUITER or TECHNICAL_INTERVIEWER");
        }

        RecruitmentRole role = recruitmentRoleRepository.findByType(roleType)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Role with type " + roleType + " not found. Please ensure the recruitment roles are initialized."));
        
        user.setRole(role);

        try {
            RecruitmentUser savedUser = recruitmentUserRepository.save(user);
            return mapToResponse(savedUser);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            if (e.getMessage() != null && e.getMessage().contains("email")) {
                throw new BadRequestException("Email already exists");
            }
            throw new BadRequestException("Failed to save user: " + (e.getCause() != null ? e.getCause().getMessage() : e.getMessage()));
        } catch (Exception e) {
            throw new BadRequestException("Failed to save user: " + (e.getCause() != null ? e.getCause().getMessage() : e.getMessage()));
        }
    }

    public RecruitmentUserResponse getRecruitmentUserById(Long id) {
        RecruitmentUser user = recruitmentUserRepository.findWithRoleById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recruitment user not found"));
        return mapToResponse(user);
    }

    public List<RecruitmentUserResponse> getAllRecruitmentUsers() {
        return recruitmentUserRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void deleteRecruitmentUser(Long id) {
        RecruitmentUser user = recruitmentUserRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recruitment user not found"));
        recruitmentUserRepository.delete(user);
    }

    private RecruitmentUserResponse mapToResponse(RecruitmentUser user) {
        RecruitmentUserResponse response = new RecruitmentUserResponse();
        response.setId(user.getId());
        response.setName(user.getName());
        response.setEmail(user.getEmail());
        response.setStatus(user.getStatus().name());
        response.setCreatedAt(user.getCreatedAt());
        response.setUpdatedAt(user.getUpdatedAt());
        
        if (user.getRole() != null) {
            response.setRoleId(user.getRole().getId());
            response.setRoleName(user.getRole().getName());
            response.setRoleType(user.getRole().getType() != null ? user.getRole().getType().name() : null);
        }
        
        return response;
    }
}

