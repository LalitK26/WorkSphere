package com.dashboard.app.service;

import com.dashboard.app.dto.request.BulkShiftAssignmentRequest;
import com.dashboard.app.dto.request.ShiftUpdateRequest;
import com.dashboard.app.dto.response.*;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ForbiddenException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.Shift;
import com.dashboard.app.model.ShiftAssignment;
import com.dashboard.app.model.User;
import com.dashboard.app.model.enums.UserStatus;
import com.dashboard.app.repository.ShiftAssignmentRepository;
import com.dashboard.app.repository.ShiftRepository;
import com.dashboard.app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class ShiftAssignmentService {

    private static final Logger logger = LoggerFactory.getLogger(ShiftAssignmentService.class);

    @Autowired
    private ShiftAssignmentRepository shiftAssignmentRepository;

    @Autowired
    private ShiftRepository shiftRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private DashboardEmailService dashboardEmailService;

    @CacheEvict(value = "shiftRoster", allEntries = true)
    public void assignBulkShift(BulkShiftAssignmentRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        // Check if user has add permission
        String addPermission = permissionService.getModulePermission(currentUserId, "Shift Roster", "add");
        if ("None".equals(addPermission)) {
            throw new ForbiddenException("You do not have permission to assign shifts");
        }

        // For shift assignments, only "All" permission allows bulk assignment
        if (!"All".equals(addPermission)) {
            throw new ForbiddenException("You do not have permission to assign shifts");
        }

        Shift shift = shiftRepository.findById(request.getShiftId())
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found"));

        List<User> users = userRepository.findAllById(request.getEmployeeIds());
        if (users.isEmpty()) {
            throw new BadRequestException("No employees found for assignment");
        }

        List<LocalDate> targetDates = resolveTargetDates(request);
        if (targetDates.isEmpty()) {
            throw new BadRequestException("No dates resolved for shift assignment");
        }

        for (User user : users) {
            for (LocalDate date : targetDates) {
                ShiftAssignment existingAssignment = shiftAssignmentRepository
                        .findByUserIdAndShiftDate(user.getId(), date)
                        .orElse(null);
                
                boolean isUpdate = existingAssignment != null;
                String oldShiftName = isUpdate && existingAssignment.getShift() != null 
                        ? existingAssignment.getShift().getName() : null;
                
                ShiftAssignment assignment = existingAssignment != null ? existingAssignment : new ShiftAssignment();

                assignment.setUser(user);
                assignment.setShift(shift);
                assignment.setShiftDate(date);
                assignment.setRemark(request.getRemark());
                assignment.setSendEmail(Boolean.TRUE.equals(request.getSendEmail()));
                if (request.getFileName() != null && request.getFileContent() != null) {
                    assignment.setAttachmentName(request.getFileName());
                    assignment.setAttachmentData(request.getFileContent());
                }
                shiftAssignmentRepository.save(assignment);
                
                // Send email notification if sendEmail is true
                if (Boolean.TRUE.equals(request.getSendEmail())) {
                    if (user.getEmail() != null && !user.getEmail().isBlank()) {
                        try {
                            if (isUpdate && oldShiftName != null && !oldShiftName.equals(shift.getName())) {
                                // Shift updated
                                logger.info("Sending shift updated notification to: {} for date: {} (shift: {} -> {})", 
                                    user.getEmail(), date, oldShiftName, shift.getName());
                                dashboardEmailService.sendShiftUpdatedNotification(
                                    user.getEmail(),
                                    user.getFullName(),
                                    oldShiftName,
                                    shift.getName(),
                                    shift.getStartTime(),
                                    shift.getEndTime(),
                                    date,
                                    request.getRemark()
                                );
                            } else if (!isUpdate) {
                                // New shift assignment
                                logger.info("Sending shift assigned notification to: {} for date: {} (shift: {})", 
                                    user.getEmail(), date, shift.getName());
                                dashboardEmailService.sendShiftAssignedNotification(
                                    user.getEmail(),
                                    user.getFullName(),
                                    shift.getName(),
                                    shift.getStartTime(),
                                    shift.getEndTime(),
                                    date,
                                    request.getRemark()
                                );
                            } else {
                                logger.debug("No email sent for shift assignment: same shift as before or update without shift change");
                            }
                        } catch (Exception e) {
                            logger.error("Failed to send shift notification to {} for date {}: {}", 
                                user.getEmail(), date, e.getMessage(), e);
                        }
                    } else {
                        logger.warn("Employee {} has no email configured. Shift notification skipped for date: {}", 
                            user.getFullName(), date);
                    }
                } else {
                    logger.debug("Email notification not requested for shift assignment: user={}, date={}", 
                        user.getFullName(), date);
                }
            }
        }
    }

    @CacheEvict(value = "shiftRoster", allEntries = true)
    public ShiftAssignmentResponse upsertSingleShift(ShiftUpdateRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        // Check if user has update permission (for updating existing) or add permission (for creating new)
        String updatePermission = permissionService.getModulePermission(currentUserId, "Shift Roster", "update");
        String addPermission = permissionService.getModulePermission(currentUserId, "Shift Roster", "add");
        
        // Check if assignment already exists
        LocalDate date = LocalDate.parse(request.getDate());
        ShiftAssignment existing = shiftAssignmentRepository
                .findByUserIdAndShiftDate(request.getUserId(), date)
                .orElse(null);
        
        if (existing != null) {
            // Updating existing assignment - need update permission
            if ("None".equals(updatePermission)) {
                throw new ForbiddenException("You do not have permission to update shift assignments");
            }
            if (!"All".equals(updatePermission)) {
                throw new ForbiddenException("You do not have permission to update shift assignments");
            }
        } else {
            // Creating new assignment - need add permission
            if ("None".equals(addPermission)) {
                throw new ForbiddenException("You do not have permission to assign shifts");
            }
            if (!"All".equals(addPermission)) {
                throw new ForbiddenException("You do not have permission to assign shifts");
            }
        }

        Shift shift = shiftRepository.findById(request.getShiftId())
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found"));

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found"));

        // Track old shift for update notification
        boolean isUpdate = existing != null;
        String oldShiftName = isUpdate && existing.getShift() != null ? existing.getShift().getName() : null;

        ShiftAssignment assignment = existing != null ? existing : new ShiftAssignment();

        assignment.setUser(user);
        assignment.setShift(shift);
        assignment.setShiftDate(date);
        assignment.setRemark(request.getRemark());
        assignment.setSendEmail(Boolean.TRUE.equals(request.getSendEmail()));
        if (request.getFileName() != null && request.getFileContent() != null) {
            assignment.setAttachmentName(request.getFileName());
            assignment.setAttachmentData(request.getFileContent());
        }

        ShiftAssignment saved = shiftAssignmentRepository.save(assignment);
        
        // Send email notification if sendEmail is true
        if (Boolean.TRUE.equals(request.getSendEmail())) {
            if (user.getEmail() != null && !user.getEmail().isBlank()) {
                try {
                    if (isUpdate && oldShiftName != null && !oldShiftName.equals(shift.getName())) {
                        // Shift updated
                        logger.info("Sending shift updated notification to: {} for date: {} (shift: {} -> {})", 
                            user.getEmail(), date, oldShiftName, shift.getName());
                        dashboardEmailService.sendShiftUpdatedNotification(
                            user.getEmail(),
                            user.getFullName(),
                            oldShiftName,
                            shift.getName(),
                            shift.getStartTime(),
                            shift.getEndTime(),
                            date,
                            request.getRemark()
                        );
                    } else if (!isUpdate) {
                        // New shift assignment
                        logger.info("Sending shift assigned notification to: {} for date: {} (shift: {})", 
                            user.getEmail(), date, shift.getName());
                        dashboardEmailService.sendShiftAssignedNotification(
                            user.getEmail(),
                            user.getFullName(),
                            shift.getName(),
                            shift.getStartTime(),
                            shift.getEndTime(),
                            date,
                            request.getRemark()
                        );
                    } else {
                        logger.debug("No email sent for shift update: same shift as before");
                    }
                } catch (Exception e) {
                    logger.error("Failed to send shift notification to {} for date {}: {}", 
                        user.getEmail(), date, e.getMessage(), e);
                }
            } else {
                logger.warn("Employee {} has no email configured. Shift notification skipped for date: {}", 
                    user.getFullName(), date);
            }
        } else {
            logger.debug("Email notification not requested for single shift update: user={}, date={}", 
                user.getFullName(), date);
        }
        
        return mapAssignment(saved);
    }

    @Cacheable(value = "shiftRoster", key = "#year + '_' + #month + '_' + #currentUserId + '_' + (#search != null ? #search : '') + '_' + #page + '_' + #size")
    public ShiftRosterResponse getRoster(int year, int month, Long currentUserId, String search, int page, int size) {
        if (currentUserId == null) {
            return new ShiftRosterResponse();
        }

        String viewPermission = permissionService.getModulePermission(currentUserId, "Shift Roster", "view");
        
        // If no permission, return empty roster
        if ("None".equals(viewPermission)) {
            return new ShiftRosterResponse();
        }

        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());

        // Fetch all assignments for the date range
        List<ShiftAssignment> allAssignments = shiftAssignmentRepository.findByShiftDateBetween(start, end);
        
        // Filter assignments based on permission level using canAccessItem for consistency
        List<ShiftAssignment> filteredAssignments = allAssignments.stream()
                .filter(assignment -> {
                    // For shift assignments: user = assignedTo (the employee assigned to the shift)
                    Long assignedToUserId = assignment.getUser() != null ? assignment.getUser().getId() : null;
                    // ShiftAssignment doesn't have a createdBy field, so we pass null
                    Long createdByUserId = null;
                    
                    return permissionService.canAccessItem(
                            currentUserId, "Shift Roster", "view",
                            createdByUserId, assignedToUserId, null
                    );
                })
                .collect(Collectors.toList());

        // Get unique user IDs from filtered assignments
        Set<Long> allowedUserIds = filteredAssignments.stream()
                .map(assignment -> assignment.getUser().getId())
                .collect(Collectors.toSet());

        // Fetch users - only those who have assignments (for restricted permissions) or all users (for "All")
        List<User> users;
        if ("All".equals(viewPermission)) {
            users = userRepository.findAll();
        } else {
            // For "Owned", "Added", or "Added & Owned", only show users who have assignments
            if (allowedUserIds.isEmpty()) {
                users = Collections.emptyList();
            } else {
                users = userRepository.findAllById(allowedUserIds);
            }
        }

        // Group assignments by user ID
        Map<Long, List<ShiftAssignment>> assignmentMap = filteredAssignments.stream()
                .collect(Collectors.groupingBy(a -> a.getUser().getId()));

        // Apply search filter if provided
        List<User> filteredUsers = users.stream()
                .filter(user -> user.getStatus() == null || user.getStatus() == UserStatus.ACTIVE)
                .filter(user -> {
                    if (search == null || search.trim().isEmpty()) {
                        return true;
                    }
                    String searchLower = search.toLowerCase().trim();
                    String fullName = (user.getFullName() != null ? user.getFullName() : "").toLowerCase();
                    String designation = (user.getDesignation() != null && user.getDesignation().getName() != null 
                        ? user.getDesignation().getName() : "").toLowerCase();
                    String employeeId = (user.getEmployeeId() != null ? user.getEmployeeId() : "").toLowerCase();
                    return fullName.contains(searchLower) || designation.contains(searchLower) || employeeId.contains(searchLower);
                })
                .collect(Collectors.toList());

        // Calculate pagination
        int totalElements = filteredUsers.size();
        int totalPages = size > 0 ? (int) Math.ceil((double) totalElements / size) : 1;
        int currentPage = page;
        
        // Apply pagination
        List<User> paginatedUsers = filteredUsers;
        if (size > 0) {
            int paginationStart = page * size;
            int paginationEnd = Math.min(paginationStart + size, totalElements);
            if (paginationStart < totalElements) {
                paginatedUsers = filteredUsers.subList(paginationStart, paginationEnd);
            } else {
                paginatedUsers = Collections.emptyList();
            }
        }

        List<ShiftRosterEmployeeResponse> employees = paginatedUsers.stream()
                .map(user -> {
                    List<ShiftAssignment> userAssignments = assignmentMap.getOrDefault(user.getId(), Collections.emptyList());
                    Map<LocalDate, ShiftAssignment> byDate = userAssignments.stream()
                            .collect(Collectors.toMap(ShiftAssignment::getShiftDate, a -> a, (a, b) -> a));

                    List<ShiftRosterDayResponse> days = new ArrayList<>();
                    LocalDate cursor = start;
                    while (!cursor.isAfter(end)) {
                        ShiftAssignment dayAssignment = byDate.get(cursor);

                        boolean isSunday = cursor.getDayOfWeek() == DayOfWeek.SUNDAY;

                        ShiftRosterDayResponse dayResponse = new ShiftRosterDayResponse();
                        dayResponse.setDate(cursor);
                        dayResponse.setSunday(isSunday);
                        dayResponse.setHoliday(isSunday);
                        if (dayAssignment != null) {
                            dayResponse.setAssignmentId(dayAssignment.getId());
                            dayResponse.setShift(mapShift(dayAssignment.getShift()));
                        }
                        days.add(dayResponse);
                        cursor = cursor.plusDays(1);
                    }

                    return new ShiftRosterEmployeeResponse(
                            user.getId(),
                            user.getFullName(),
                            user.getDesignation() != null ? user.getDesignation().getName() : null,
                            com.dashboard.app.util.FileUrlUtil.convertFilePathToUrl(user.getProfilePictureUrl()),
                            days
                    );
                })
                .collect(Collectors.toList());

        ShiftRosterResponse response = new ShiftRosterResponse();
        response.setYear(year);
        response.setMonth(month);
        response.setEmployees(employees);
        response.setTotalElements(totalElements);
        response.setTotalPages(totalPages);
        response.setCurrentPage(currentPage);
        response.setPageSize(size > 0 ? size : totalElements);
        return response;
    }

    private List<LocalDate> resolveTargetDates(BulkShiftAssignmentRequest request) {
        List<LocalDate> dates = new ArrayList<>();
        switch (request.getAssignType().toUpperCase()) {
            case "DATE" -> {
                if (request.getDate() == null) {
                    throw new BadRequestException("Date is required for assignment");
                }
                dates.add(LocalDate.parse(request.getDate()));
            }
            case "MULTIPLE" -> {
                if ((request.getRangeStart() == null || request.getRangeEnd() == null)) {
                    throw new BadRequestException("Start and end dates are required for range assignment");
                }
                LocalDate start = LocalDate.parse(request.getRangeStart());
                LocalDate end = LocalDate.parse(request.getRangeEnd());
                if (end.isBefore(start)) {
                    throw new BadRequestException("End date cannot be before start date");
                }
                LocalDate cursor = start;
                while (!cursor.isAfter(end)) {
                    dates.add(cursor);
                    cursor = cursor.plusDays(1);
                }
            }
            case "MONTH" -> {
                if (request.getYear() == null || request.getMonth() == null) {
                    throw new BadRequestException("Year and month are required for monthly assignment");
                }
                LocalDate start = LocalDate.of(request.getYear(), request.getMonth(), 1);
                LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
                LocalDate cursor = start;
                while (!cursor.isAfter(end)) {
                    dates.add(cursor);
                    cursor = cursor.plusDays(1);
                }
            }
            default -> throw new BadRequestException("Invalid assign type");
        }
        List<LocalDate> filtered = dates.stream()
                .filter(date -> date.getDayOfWeek() != DayOfWeek.SUNDAY)
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        if (filtered.isEmpty()) {
            throw new BadRequestException("Selected range only contains Sundays. Please choose working days.");
        }

        return filtered;
    }


    private ShiftAssignmentResponse mapAssignment(ShiftAssignment assignment) {
        ShiftAssignmentResponse response = new ShiftAssignmentResponse();
        response.setId(assignment.getId());
        response.setUserId(assignment.getUser().getId());
        response.setEmployeeName(assignment.getUser().getFullName());
        response.setShiftDate(assignment.getShiftDate());
        response.setShift(mapShift(assignment.getShift()));
        response.setRemark(assignment.getRemark());
        response.setHasAttachment(assignment.getAttachmentName() != null);
        return response;
    }

    private ShiftResponse mapShift(Shift shift) {
        if (shift == null) {
            return null;
        }
        ShiftResponse response = new ShiftResponse();
        response.setId(shift.getId());
        response.setName(shift.getName());
        response.setStartTime(shift.getStartTime().toString());
        response.setEndTime(shift.getEndTime().toString());
        response.setGraceMinutes(shift.getGraceMinutes());
        response.setLabel(String.format("%s [%s - %s]", shift.getName(), shift.getStartTime(), shift.getEndTime()));
        return response;
    }
}


