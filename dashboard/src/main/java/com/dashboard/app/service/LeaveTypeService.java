package com.dashboard.app.service;

import com.dashboard.app.dto.request.LeaveTypeRequest;
import com.dashboard.app.dto.response.LeaveTypeResponse;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.LeaveType;
import com.dashboard.app.model.User;
import com.dashboard.app.repository.LeaveTypeRepository;
import com.dashboard.app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class LeaveTypeService {

    @Autowired
    private LeaveTypeRepository leaveTypeRepository;

    @Autowired
    private UserRepository userRepository;

    public LeaveTypeResponse createLeaveType(LeaveTypeRequest request) {
        validateLeaveTypeRequest(request);
        LeaveType leaveType = new LeaveType();
        populateLeaveTypeFromRequest(leaveType, request);
        LeaveType saved = leaveTypeRepository.save(leaveType);
        return mapToResponse(saved);
    }

    public LeaveTypeResponse updateLeaveType(Long id, LeaveTypeRequest request) {
        validateLeaveTypeRequest(request);
        LeaveType leaveType = leaveTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave type not found"));

        populateLeaveTypeFromRequest(leaveType, request);

        LeaveType updated = leaveTypeRepository.save(leaveType);
        return mapToResponse(updated);
    }

    public LeaveTypeResponse getLeaveTypeById(Long id) {
        LeaveType leaveType = leaveTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave type not found"));
        return mapToResponse(leaveType);
    }

    public List<LeaveTypeResponse> getAllLeaveTypes() {
        return leaveTypeRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<LeaveTypeResponse> getApplicableLeaveTypes(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return leaveTypeRepository.findAll().stream()
                .filter(lt -> isApplicable(lt, user))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void deleteLeaveType(Long id) {
        LeaveType leaveType = leaveTypeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave type not found"));
        leaveTypeRepository.delete(leaveType);
    }

    private boolean isApplicable(LeaveType leaveType, User user) {
        // Check applicability rules (gender, marital status, department, designation)
        
        // Check gender
        if (leaveType.getGenders() != null && !leaveType.getGenders().trim().isEmpty()) {
            List<String> allowedGenders = Arrays.stream(leaveType.getGenders().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
            if (!allowedGenders.isEmpty()) {
                if (user.getGender() == null || 
                    !allowedGenders.stream().anyMatch(g -> g.equalsIgnoreCase(user.getGender()))) {
                    return false;
                }
            }
        }

        // Check marital status
        if (leaveType.getMaritalStatuses() != null && !leaveType.getMaritalStatuses().trim().isEmpty()) {
            List<String> allowedStatuses = Arrays.stream(leaveType.getMaritalStatuses().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
            if (!allowedStatuses.isEmpty()) {
                if (user.getMaritalStatus() == null || 
                    !allowedStatuses.stream().anyMatch(s -> s.equalsIgnoreCase(user.getMaritalStatus()))) {
                    return false;
                }
            }
        }

        // Check department
        if (leaveType.getDepartments() != null && !leaveType.getDepartments().trim().isEmpty()) {
            List<String> allowedDepartments = Arrays.stream(leaveType.getDepartments().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
            if (!allowedDepartments.isEmpty()) {
                if (user.getDepartment() == null || 
                    !allowedDepartments.stream().anyMatch(d -> d.equalsIgnoreCase(user.getDepartment()))) {
                    return false;
                }
            }
        }

        // Check designation
        if (leaveType.getDesignations() != null && !leaveType.getDesignations().trim().isEmpty()) {
            List<Long> allowedDesignations = Arrays.stream(leaveType.getDesignations().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(Long::parseLong)
                    .collect(Collectors.toList());
            if (!allowedDesignations.isEmpty()) {
                if (user.getDesignation() == null || 
                    !allowedDesignations.contains(user.getDesignation().getId())) {
                    return false;
                }
            }
        }

        // Check entitlement rules (effective after date, probation, notice period)
        LocalDate currentDate = LocalDate.now();

        // Check effective after date - leave type becomes available after the effective date
        if (user.getJoiningDate() != null && leaveType.getEffectiveAfterValue() != null && leaveType.getEffectiveAfterValue() > 0) {
            LocalDate effectiveDate;
            if ("MONTHS".equals(leaveType.getEffectiveAfterUnit())) {
                effectiveDate = user.getJoiningDate().plusMonths(leaveType.getEffectiveAfterValue());
            } else {
                effectiveDate = user.getJoiningDate().plusDays(leaveType.getEffectiveAfterValue());
            }
            
            // If current date is before the effective date, leave type is not yet available
            if (currentDate.isBefore(effectiveDate)) {
                return false;
            }
        }

        // Check if in probation and leave type doesn't allow probation
        if (user.getProbationEndDate() != null && 
            currentDate.isBefore(user.getProbationEndDate()) && 
            !leaveType.getAllowedInProbation()) {
            return false;
        }

        // Check if in notice period and leave type doesn't allow notice period
        if (user.getNoticePeriodStartDate() != null && 
            user.getNoticePeriodEndDate() != null &&
            currentDate.isAfter(user.getNoticePeriodStartDate()) &&
            currentDate.isBefore(user.getNoticePeriodEndDate()) &&
            !leaveType.getAllowedInNoticePeriod()) {
            return false;
        }

        return true;
    }

    private LeaveTypeResponse mapToResponse(LeaveType leaveType) {
        LeaveTypeResponse response = new LeaveTypeResponse();
        response.setId(leaveType.getId());
        response.setName(leaveType.getName());
        response.setAllotmentType(leaveType.getAllotmentType());
        response.setNoOfLeaves(leaveType.getNoOfLeaves());
        response.setPaidStatus(leaveType.getPaidStatus());
        response.setEffectiveAfterValue(leaveType.getEffectiveAfterValue());
        response.setEffectiveAfterUnit(leaveType.getEffectiveAfterUnit());
        response.setUnusedLeavesAction(leaveType.getUnusedLeavesAction());
        response.setOverUtilizationAction(leaveType.getOverUtilizationAction());
        response.setAllowedInProbation(leaveType.getAllowedInProbation());
        response.setAllowedInNoticePeriod(leaveType.getAllowedInNoticePeriod());
        response.setCreatedAt(leaveType.getCreatedAt());
        response.setUpdatedAt(leaveType.getUpdatedAt());

        // Convert comma-separated strings to lists
        if (leaveType.getGenders() != null && !leaveType.getGenders().isEmpty()) {
            response.setGenders(Arrays.asList(leaveType.getGenders().split(",")));
        }
        if (leaveType.getMaritalStatuses() != null && !leaveType.getMaritalStatuses().isEmpty()) {
            response.setMaritalStatuses(Arrays.asList(leaveType.getMaritalStatuses().split(",")));
        }
        if (leaveType.getDepartments() != null && !leaveType.getDepartments().isEmpty()) {
            response.setDepartments(Arrays.asList(leaveType.getDepartments().split(",")));
        }
        if (leaveType.getDesignations() != null && !leaveType.getDesignations().isEmpty()) {
            response.setDesignations(Arrays.stream(leaveType.getDesignations().split(","))
                    .map(Long::parseLong)
                    .collect(Collectors.toList()));
        }

        return response;
    }

    private void validateLeaveTypeRequest(LeaveTypeRequest request) {
        if (request.getNoOfLeaves() == null) {
            throw new BadRequestException("Number of leaves is required");
        }
        if (request.getNoOfLeaves() < 0) {
            throw new BadRequestException("Number of leaves cannot be negative");
        }

        String unit = request.getEffectiveAfterUnit();
        if (unit == null || unit.isBlank()) {
            unit = "DAYS";
        } else {
            unit = unit.toUpperCase();
        }

        if (!unit.equals("DAYS") && !unit.equals("MONTHS")) {
            throw new BadRequestException("Effective after unit must be either DAYS or MONTHS");
        }

        Integer value = request.getEffectiveAfterValue();
        if (value == null) {
            value = 0;
        }
        if (value < 0) {
            throw new BadRequestException("Effective after value cannot be negative");
        }
        if (unit.equals("MONTHS") && value > 12) {
            throw new BadRequestException("Effective after (months) must be between 0 and 12");
        }

        request.setEffectiveAfterUnit(unit);
        request.setEffectiveAfterValue(value);
    }

    private void populateLeaveTypeFromRequest(LeaveType leaveType, LeaveTypeRequest request) {
        leaveType.setName(request.getName());
        leaveType.setAllotmentType(request.getAllotmentType());
        leaveType.setNoOfLeaves(request.getNoOfLeaves());
        leaveType.setPaidStatus(request.getPaidStatus());
        leaveType.setEffectiveAfterValue(request.getEffectiveAfterValue());
        leaveType.setEffectiveAfterUnit(request.getEffectiveAfterUnit());
        leaveType.setUnusedLeavesAction(request.getUnusedLeavesAction() != null ? request.getUnusedLeavesAction() : "CARRY_FORWARD");
        leaveType.setOverUtilizationAction(request.getOverUtilizationAction() != null ? request.getOverUtilizationAction() : "DO_NOT_ALLOW");
        leaveType.setAllowedInProbation(request.getAllowedInProbation() != null ? request.getAllowedInProbation() : false);
        leaveType.setAllowedInNoticePeriod(request.getAllowedInNoticePeriod() != null ? request.getAllowedInNoticePeriod() : false);

        leaveType.setGenders(toCommaSeparated(request.getGenders()));
        leaveType.setMaritalStatuses(toCommaSeparated(request.getMaritalStatuses()));
        leaveType.setDepartments(toCommaSeparated(request.getDepartments()));
        leaveType.setDesignations(
                request.getDesignations() != null && !request.getDesignations().isEmpty()
                        ? request.getDesignations().stream().map(String::valueOf).collect(Collectors.joining(","))
                        : null
        );
    }

    private String toCommaSeparated(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        return String.join(",", values);
    }
}

