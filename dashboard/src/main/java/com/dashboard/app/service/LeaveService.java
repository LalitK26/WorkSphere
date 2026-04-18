package com.dashboard.app.service;

import com.dashboard.app.dto.request.LeaveRequest;
import com.dashboard.app.dto.response.LeaveQuotaResponse;
import com.dashboard.app.dto.response.LeaveResponse;
import com.dashboard.app.dto.response.LeaveTypeResponse;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ForbiddenException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.Leave;
import com.dashboard.app.model.LeaveType;
import com.dashboard.app.model.User;
import com.dashboard.app.repository.LeaveRepository;
import com.dashboard.app.repository.LeaveTypeRepository;
import com.dashboard.app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class LeaveService {

    private static final Logger logger = LoggerFactory.getLogger(LeaveService.class);

    @Autowired
    private LeaveRepository leaveRepository;

    @Autowired
    private LeaveTypeRepository leaveTypeRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LeaveTypeService leaveTypeService;

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private DashboardEmailService dashboardEmailService;

    public LeaveResponse createLeave(LeaveRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        // Check if user has add permission
        String addPermission = permissionService.getModulePermission(currentUserId, "Leaves", "add");
        if ("None".equals(addPermission)) {
            throw new ForbiddenException("You do not have permission to create leaves");
        }

        // If permission is "Added" or "Owned", user can only create leaves for themselves
        if (!"All".equals(addPermission) && !request.getUserId().equals(currentUserId)) {
            throw new ForbiddenException("You can only create leaves for yourself");
        }

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        LeaveType leaveType = leaveTypeRepository.findById(request.getLeaveTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Leave type not found"));

        // Check if leave type is applicable to user
        List<LeaveTypeResponse> applicableTypes = leaveTypeService.getApplicableLeaveTypes(request.getUserId());
        boolean isApplicable = applicableTypes.stream()
                .anyMatch(lt -> lt.getId().equals(request.getLeaveTypeId()));
        if (!isApplicable) {
            throw new BadRequestException("This leave type is not applicable to the selected employee");
        }

        LocalDate startDate = LocalDate.parse(request.getStartDate());
        LocalDate endDate = LocalDate.parse(request.getEndDate());

        if (endDate.isBefore(startDate)) {
            throw new BadRequestException("End date cannot be before start date");
        }

        // Validate leave rules
        validateLeaveRules(user, leaveType, startDate, endDate);

        Leave leave = new Leave();
        leave.setUser(user);
        leave.setLeaveType(leaveType);
        leave.setStartDate(startDate);
        leave.setEndDate(endDate);
        leave.setDurationType(request.getDurationType());
        leave.setStatus(request.getStatus() != null ? request.getStatus() : "PENDING");
        leave.setReason(request.getReason());
        leave.setFileUrl(request.getFileUrl());

        Leave saved = leaveRepository.save(leave);
        
        // Fetch again with relationships loaded to avoid lazy loading issues
        Leave leaveWithRelations = leaveRepository.findByIdWithRelations(saved.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Leave not found after creation"));
        
        return mapToResponse(leaveWithRelations);
    }

    public LeaveResponse updateLeave(Long id, LeaveRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Leave leave = leaveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave not found"));

        // Check if user has update permission
        String updatePermission = permissionService.getModulePermission(currentUserId, "Leaves", "update");
        if ("None".equals(updatePermission)) {
            throw new ForbiddenException("You do not have permission to update leaves");
        }

        // If permission is "Added" or "Owned", check ownership
        if (!"All".equals(updatePermission)) {
            Long leaveUserId = leave.getUser() != null ? leave.getUser().getId() : null;
            boolean canAccess = permissionService.canAccessItem(
                    currentUserId, "Leaves", "update",
                    leaveUserId, null, null
            );
            if (!canAccess) {
                throw new ForbiddenException("You do not have permission to update this leave");
            }
        }

        if (request.getLeaveTypeId() != null) {
            LeaveType leaveType = leaveTypeRepository.findById(request.getLeaveTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Leave type not found"));
            leave.setLeaveType(leaveType);
        }

        if (request.getStartDate() != null) {
            leave.setStartDate(LocalDate.parse(request.getStartDate()));
        }
        if (request.getEndDate() != null) {
            leave.setEndDate(LocalDate.parse(request.getEndDate()));
        }
        if (request.getDurationType() != null) {
            leave.setDurationType(request.getDurationType());
        }
        // Track status change for email notification
        String previousStatus = leave.getStatus();
        String newStatus = request.getStatus();
        
        if (newStatus != null) {
            leave.setStatus(newStatus);
        }
        if (request.getReason() != null) {
            leave.setReason(request.getReason());
        }
        if (request.getFileUrl() != null) {
            leave.setFileUrl(request.getFileUrl());
        }

        Leave updated = leaveRepository.save(leave);
        
        // Fetch again with relationships loaded to avoid lazy loading issues
        Leave leaveWithRelations = leaveRepository.findByIdWithRelations(updated.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Leave not found after update"));
        
        // Send email notification if status changed to APPROVED or REJECTED
        if (newStatus != null && !newStatus.equals(previousStatus)) {
            try {
                User currentUser = userRepository.findById(currentUserId).orElse(null);
                String approverName = currentUser != null ? currentUser.getFullName() : "HR Team";
                User leaveUser = leaveWithRelations.getUser();
                
                if (leaveUser != null && leaveUser.getEmail() != null) {
                    String employeeName = leaveUser.getFullName();
                    String leaveTypeName = leaveWithRelations.getLeaveType() != null 
                            ? leaveWithRelations.getLeaveType().getName() : "Leave";
                    
                    if ("APPROVED".equalsIgnoreCase(newStatus)) {
                        dashboardEmailService.sendLeaveApprovedNotification(
                                leaveUser.getEmail(),
                                employeeName,
                                leaveTypeName,
                                leaveWithRelations.getStartDate(),
                                leaveWithRelations.getEndDate(),
                                approverName,
                                leaveWithRelations.getId()
                        );
                        logger.info("Leave approval email sent to: {}", leaveUser.getEmail());
                    } else if ("REJECTED".equalsIgnoreCase(newStatus)) {
                        dashboardEmailService.sendLeaveRejectedNotification(
                                leaveUser.getEmail(),
                                employeeName,
                                leaveTypeName,
                                leaveWithRelations.getStartDate(),
                                leaveWithRelations.getEndDate(),
                                approverName,
                                null, // No rejection reason in current implementation
                                leaveWithRelations.getId()
                        );
                        logger.info("Leave rejection email sent to: {}", leaveUser.getEmail());
                    }
                }
            } catch (Exception e) {
                logger.error("Failed to send leave status email notification: {}", e.getMessage(), e);
                // Don't fail the operation if email fails
            }
        }
        
        return mapToResponse(leaveWithRelations);
    }

    public LeaveResponse getLeaveById(Long id, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Leave leave = leaveRepository.findByIdWithRelations(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave not found"));

        // Check if user has view permission
        String viewPermission = permissionService.getModulePermission(currentUserId, "Leaves", "view");
        if ("None".equals(viewPermission)) {
            throw new ForbiddenException("You do not have permission to view leaves");
        }

        // If "All" permission, allow access
        if ("All".equals(viewPermission)) {
            return mapToResponse(leave);
        }

        // For other permissions, check ownership
        Long leaveUserId = leave.getUser() != null ? leave.getUser().getId() : null;
        
        boolean canAccess = permissionService.canAccessItem(
                currentUserId, "Leaves", "view",
                leaveUserId, null, null
        );
        
        if (!canAccess) {
            throw new ForbiddenException("You do not have permission to view this leave");
        }

        return mapToResponse(leave);
    }

    public List<LeaveResponse> getAllLeaves(LocalDate startDate, LocalDate endDate, Long userId, Long leaveTypeId, String status, Long currentUserId) {
        if (currentUserId == null) {
            return new ArrayList<>();
        }

        String viewPermission = permissionService.getModulePermission(currentUserId, "Leaves", "view");
        
        // If no permission, return empty list
        if ("None".equals(viewPermission)) {
            return new ArrayList<>();
        }

        List<Leave> leaves;

        if (startDate != null && endDate != null) {
            if (userId != null) {
                leaves = leaveRepository.findByUserIdAndDateRange(userId, startDate, endDate);
            } else {
                leaves = leaveRepository.findByDateRange(startDate, endDate);
            }
        } else if (userId != null) {
            leaves = leaveRepository.findByUserId(userId);
        } else {
            leaves = leaveRepository.findAllWithRelations();
        }

        // If "All" permission, return all leaves (after applying other filters)
        if ("All".equals(viewPermission)) {
            return leaves.stream()
                    .filter(l -> leaveTypeId == null || l.getLeaveType().getId().equals(leaveTypeId))
                    .filter(l -> status == null || l.getStatus().equals(status))
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }

        // Filter based on permission level
        return leaves.stream()
                .filter(l -> {
                    Long leaveUserId = l.getUser() != null ? l.getUser().getId() : null;
                    // For leaves: user = createdBy (person who created the leave request)
                    return permissionService.canAccessItem(
                            currentUserId, "Leaves", "view",
                            leaveUserId, null, null
                    );
                })
                .filter(l -> leaveTypeId == null || l.getLeaveType().getId().equals(leaveTypeId))
                .filter(l -> status == null || l.getStatus().equals(status))
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<LeaveResponse> getMyLeaves(Long userId) {
        return leaveRepository.findByUserId(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<LeaveQuotaResponse> getLeaveQuota(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<LeaveTypeResponse> applicableTypes = leaveTypeService.getApplicableLeaveTypes(userId);
        List<LeaveQuotaResponse> quotas = new ArrayList<>();

        LocalDate currentDate = LocalDate.now();
        int currentYear = currentDate.getYear();
        int currentMonth = currentDate.getMonthValue();

        for (LeaveTypeResponse leaveType : applicableTypes) {
            LeaveQuotaResponse quota = new LeaveQuotaResponse();
            quota.setLeaveTypeId(leaveType.getId());
            quota.setLeaveTypeName(leaveType.getName());

            // Get all approved leaves for this type
            List<Leave> approvedLeaves = leaveRepository.findByUserId(userId).stream()
                    .filter(l -> l.getLeaveType().getId().equals(leaveType.getId()))
                    .filter(l -> "APPROVED".equals(l.getStatus()))
                    .collect(Collectors.toList());

            double totalTaken = 0.0;
            for (Leave leave : approvedLeaves) {
                if ("MONTHLY".equals(leaveType.getAllotmentType())) {
                    // For monthly, count leaves in current month
                    if (leave.getStartDate().getYear() == currentYear && 
                        leave.getStartDate().getMonthValue() == currentMonth) {
                        if ("FULL_DAY".equals(leave.getDurationType())) {
                            totalTaken += ChronoUnit.DAYS.between(leave.getStartDate(), leave.getEndDate()) + 1;
                        } else if ("FIRST_HALF".equals(leave.getDurationType()) || "SECOND_HALF".equals(leave.getDurationType())) {
                            totalTaken += 0.5;
                        }
                    }
                } else {
                    // For yearly, count all leaves in current year
                    if (leave.getStartDate().getYear() == currentYear) {
                        if ("FULL_DAY".equals(leave.getDurationType()) || "MULTIPLE".equals(leave.getDurationType())) {
                            totalTaken += ChronoUnit.DAYS.between(leave.getStartDate(), leave.getEndDate()) + 1;
                        } else if ("FIRST_HALF".equals(leave.getDurationType()) || "SECOND_HALF".equals(leave.getDurationType())) {
                            totalTaken += 0.5;
                        }
                    }
                }
            }

            quota.setNoOfLeaves(leaveType.getNoOfLeaves());
            quota.setMonthlyLimit("MONTHLY".equals(leaveType.getAllotmentType()) ? leaveType.getNoOfLeaves() : null);
            quota.setTotalLeavesTaken(totalTaken);
            quota.setRemainingLeaves(Math.max(0, leaveType.getNoOfLeaves() - totalTaken));
            quota.setOverUtilized(Math.max(0, totalTaken - leaveType.getNoOfLeaves()));
            quota.setUnusedLeaves(Math.max(0, leaveType.getNoOfLeaves() - totalTaken));

            quotas.add(quota);
        }

        return quotas;
    }

    public void deleteLeave(Long id, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Leave leave = leaveRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Leave not found"));

        // Check if user has delete permission
        String deletePermission = permissionService.getModulePermission(currentUserId, "Leaves", "delete");
        if ("None".equals(deletePermission)) {
            throw new ForbiddenException("You do not have permission to delete leaves");
        }

        // If permission is "Added" or "Owned", check ownership
        if (!"All".equals(deletePermission)) {
            Long leaveUserId = leave.getUser() != null ? leave.getUser().getId() : null;
            boolean canAccess = permissionService.canAccessItem(
                    currentUserId, "Leaves", "delete",
                    leaveUserId, null, null
            );
            if (!canAccess) {
                throw new ForbiddenException("You do not have permission to delete this leave");
            }
        }

        leaveRepository.delete(leave);
    }

    private void validateLeaveRules(User user, LeaveType leaveType, LocalDate startDate, LocalDate endDate) {
        // Check if in probation
        if (user.getProbationEndDate() != null && 
            LocalDate.now().isBefore(user.getProbationEndDate()) && 
            !leaveType.getAllowedInProbation()) {
            throw new BadRequestException("This leave type is not allowed during probation period");
        }

        // Check if in notice period
        if (user.getNoticePeriodStartDate() != null && 
            user.getNoticePeriodEndDate() != null &&
            LocalDate.now().isAfter(user.getNoticePeriodStartDate()) &&
            LocalDate.now().isBefore(user.getNoticePeriodEndDate()) &&
            !leaveType.getAllowedInNoticePeriod()) {
            throw new BadRequestException("This leave type is not allowed during notice period");
        }

        // Check effective after date
        if (user.getJoiningDate() != null) {
            LocalDate effectiveDate;
            if ("MONTHS".equals(leaveType.getEffectiveAfterUnit())) {
                effectiveDate = user.getJoiningDate().plusMonths(leaveType.getEffectiveAfterValue());
            } else {
                effectiveDate = user.getJoiningDate().plusDays(leaveType.getEffectiveAfterValue());
            }

            if (startDate.isBefore(effectiveDate)) {
                throw new BadRequestException("Leave cannot be taken before the effective date: " + effectiveDate);
            }
        }
    }

    private LeaveResponse mapToResponse(Leave leave) {
        if (leave == null) {
            return null;
        }
        
        LeaveResponse response = new LeaveResponse();
        response.setId(leave.getId());
        
        // Safely handle user relationship
        if (leave.getUser() != null) {
            response.setUserId(leave.getUser().getId());
            response.setUserName(leave.getUser().getEmail());
            response.setUserFullName(leave.getUser().getFullName());
        }
        
        // Safely handle leaveType relationship
        if (leave.getLeaveType() != null) {
            response.setLeaveTypeId(leave.getLeaveType().getId());
            response.setLeaveTypeName(leave.getLeaveType().getName());
            response.setPaidStatus(leave.getLeaveType().getPaidStatus());
        }
        
        response.setStartDate(leave.getStartDate());
        response.setEndDate(leave.getEndDate());
        response.setDurationType(leave.getDurationType());
        response.setStatus(leave.getStatus());
        response.setReason(leave.getReason());
        response.setFileUrl(leave.getFileUrl());
        response.setCreatedAt(leave.getCreatedAt());
        response.setUpdatedAt(leave.getUpdatedAt());
        return response;
    }
}

