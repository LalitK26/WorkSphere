package com.dashboard.app.service;

import com.dashboard.app.dto.request.AttendanceRequest;
import com.dashboard.app.dto.request.BulkAttendanceRequest;
import com.dashboard.app.dto.request.ClockInRequest;
import com.dashboard.app.dto.request.ClockOutRequest;
import com.dashboard.app.dto.response.AttendanceResponse;
import com.dashboard.app.dto.response.AttendanceLocationResponse;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ForbiddenException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.*;
import com.dashboard.app.model.enums.AttendanceStatus;
import com.dashboard.app.repository.AttendanceRepository;
import com.dashboard.app.repository.HolidayRepository;
import com.dashboard.app.repository.LeaveRepository;
import com.dashboard.app.repository.ShiftAssignmentRepository;
import com.dashboard.app.repository.ShiftRepository;
import com.dashboard.app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class AttendanceService {

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ShiftAssignmentRepository shiftAssignmentRepository;

    @Autowired
    private ShiftRepository shiftRepository;

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private HolidayService holidayService;

    @Autowired
    private HolidayRepository holidayRepository;

    @Autowired
    private LeaveRepository leaveRepository;

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Get today's date in UTC timezone to match database timezone
     * This ensures date queries match stored dates regardless of server timezone
     */
    private LocalDate getTodayInUtc() {
        return ZonedDateTime.now(ZoneId.of("UTC")).toLocalDate();
    }

    @CacheEvict(value = "attendance", allEntries = true)
    public AttendanceResponse markAttendance(AttendanceRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        // Check if user has add permission
        String addPermission = permissionService.getModulePermission(currentUserId, "Attendance", "add");
        if ("None".equals(addPermission)) {
            throw new ForbiddenException("You do not have permission to mark attendance");
        }

        // If permission is "Added" or "Owned", user can only mark attendance for themselves
        if (!"All".equals(addPermission) && !request.getUserId().equals(currentUserId)) {
            throw new ForbiddenException("You can only mark attendance for yourself");
        }

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        LocalDate date = request.getAttendanceDate() != null ? request.getAttendanceDate() : getTodayInUtc();

        // Check if attendance already exists for this date
        attendanceRepository.findByUserIdAndAttendanceDate(user.getId(), date)
                .ifPresent(attendance -> {
                    throw new BadRequestException("Attendance already marked for this date");
                });

        Attendance attendance = new Attendance();
        attendance.setUser(user);
        attendance.setAttendanceDate(date);
        attendance.setStatus(AttendanceStatus.valueOf(request.getStatus().toUpperCase()));
        attendance.setClockIn(request.getClockIn());
        attendance.setClockOut(request.getClockOut());
        attendance.setNotes(request.getNotes());

        if (request.getClockIn() != null && request.getClockOut() != null) {
            Duration duration = Duration.between(request.getClockIn(), request.getClockOut());
            attendance.setDurationMinutes(duration.toMinutes());
        } else {
            attendance.setDurationMinutes(request.getDurationMinutes());
        }

        attendance.setBreakMinutes(request.getBreakMinutes() != null ? request.getBreakMinutes() : 0L);

        Attendance saved = attendanceRepository.save(attendance);
        return mapToResponse(saved);
    }

    public AttendanceResponse clockIn(Long userId, ClockInRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        LocalDate today = getTodayInUtc();
        Attendance attendance = attendanceRepository.findByUserIdAndAttendanceDate(userId, today)
                .orElse(new Attendance());

        if (attendance.getClockIn() != null) {
            throw new BadRequestException("Already clocked in today");
        }

        LocalTime now = LocalTime.now();

        attendance.setUser(user);
        attendance.setAttendanceDate(today);
        attendance.setClockIn(now);
        attendance.setStatus(resolveAttendanceStatus(user, today, now));
        
        // Set location data if provided
        if (request != null) {
            attendance.setClockInLatitude(request.getLatitude());
            attendance.setClockInLongitude(request.getLongitude());
            attendance.setClockInLocation(request.getLocation());
            attendance.setClockInWorkingFrom(request.getWorkingFrom());
        }

        Attendance saved = attendanceRepository.save(attendance);
        return mapToResponse(saved);
    }
    
    public AttendanceResponse clockIn(Long userId) {
        return clockIn(userId, null);
    }

    public AttendanceResponse clockOut(Long userId, ClockOutRequest request) {
        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        LocalDate today = getTodayInUtc();
        Attendance attendance = attendanceRepository.findByUserIdAndAttendanceDate(userId, today)
                .orElseThrow(() -> new BadRequestException("Please clock in first"));

        if (attendance.getClockOut() != null) {
            throw new BadRequestException("Already clocked out today");
        }

        attendance.setClockOut(LocalTime.now());
        if (attendance.getClockIn() != null) {
            Duration duration = Duration.between(attendance.getClockIn(), attendance.getClockOut());
            attendance.setDurationMinutes(duration.toMinutes());
        }
        
        // Set location data if provided
        if (request != null) {
            attendance.setClockOutLatitude(request.getLatitude());
            attendance.setClockOutLongitude(request.getLongitude());
            attendance.setClockOutLocation(request.getLocation());
            attendance.setClockOutWorkingFrom(request.getWorkingFrom());
        }

        Attendance saved = attendanceRepository.save(attendance);
        return mapToResponse(saved);
    }
    
    public AttendanceResponse clockOut(Long userId) {
        return clockOut(userId, null);
    }
    
    /**
     * Update location for today's attendance after clock-in
     * This is used when location becomes available after initial clock-in
     */
    @CacheEvict(value = "attendance", allEntries = true)
    public AttendanceResponse updateTodayLocation(Long userId, ClockInRequest request) {
        if (request == null || request.getLatitude() == null || request.getLongitude() == null) {
            throw new BadRequestException("Location data is required");
        }
        
        LocalDate today = getTodayInUtc();
        Attendance attendance = attendanceRepository.findByUserIdAndAttendanceDate(userId, today)
                .orElseThrow(() -> new BadRequestException("No attendance record found for today. Please clock in first."));
        
        if (attendance.getClockIn() == null) {
            throw new BadRequestException("You must clock in before updating location");
        }
        
        // Update location data if provided
        attendance.setClockInLatitude(request.getLatitude());
        attendance.setClockInLongitude(request.getLongitude());
        if (request.getLocation() != null) {
            attendance.setClockInLocation(request.getLocation());
        }
        if (request.getWorkingFrom() != null) {
            attendance.setClockInWorkingFrom(request.getWorkingFrom());
        }
        
        Attendance saved = attendanceRepository.save(attendance);
        return mapToResponse(saved);
    }

    /**
     * Auto clock out an employee after 10 hours (used by scheduled task)
     * This method doesn't throw exceptions if already clocked out
     */
    public void autoClockOut(Long userId) {
        LocalDate today = getTodayInUtc();
        Optional<Attendance> attendanceOpt = attendanceRepository.findByUserIdAndAttendanceDate(userId, today);
        
        if (attendanceOpt.isPresent()) {
            Attendance attendance = attendanceOpt.get();
            // Only clock out if not already clocked out
            if (attendance.getClockIn() != null && attendance.getClockOut() == null) {
                attendance.setClockOut(LocalTime.now());
                if (attendance.getClockIn() != null) {
                    Duration duration = Duration.between(attendance.getClockIn(), attendance.getClockOut());
                    attendance.setDurationMinutes(duration.toMinutes());
                }
                attendanceRepository.save(attendance);
            }
        }
    }

    @CacheEvict(value = "attendance", allEntries = true)
    public AttendanceResponse updateAttendance(Long id, AttendanceRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance not found"));

        // Check if user has update permission
        String updatePermission = permissionService.getModulePermission(currentUserId, "Attendance", "update");
        if ("None".equals(updatePermission)) {
            throw new ForbiddenException("You do not have permission to update attendance");
        }

        // If permission is "Added" or "Owned", check ownership
        if (!"All".equals(updatePermission)) {
            Long attendanceUserId = attendance.getUser() != null ? attendance.getUser().getId() : null;
            boolean canAccess = permissionService.canAccessItem(
                    currentUserId, "Attendance", "update",
                    attendanceUserId, null, null
            );
            if (!canAccess) {
                throw new ForbiddenException("You do not have permission to update this attendance");
            }
        }

        if (request.getStatus() != null) {
            attendance.setStatus(AttendanceStatus.valueOf(request.getStatus().toUpperCase()));
        }
        if (request.getClockIn() != null) {
            attendance.setClockIn(request.getClockIn());
        }
        if (request.getClockOut() != null) {
            attendance.setClockOut(request.getClockOut());
        }
        if (request.getNotes() != null) {
            attendance.setNotes(request.getNotes());
        }

        if (attendance.getClockIn() != null && attendance.getClockOut() != null) {
            Duration duration = Duration.between(attendance.getClockIn(), attendance.getClockOut());
            attendance.setDurationMinutes(duration.toMinutes());
        }

        Attendance updated = attendanceRepository.save(attendance);
        return mapToResponse(updated);
    }

    public AttendanceResponse getAttendanceById(Long id, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance not found"));

        // Check if user has view permission
        String viewPermission = permissionService.getModulePermission(currentUserId, "Attendance", "view");
        if ("None".equals(viewPermission)) {
            throw new ForbiddenException("You do not have permission to view attendance");
        }

        // If "All" permission, allow access
        if ("All".equals(viewPermission)) {
            return mapToResponse(attendance);
        }

        // For other permissions, check ownership
        // For attendance, "Owned" means the attendance belongs to the user (attendance.user.id)
        // So we pass attendanceUserId as itemAssignedTo, not itemCreatedBy
        Long attendanceUserId = attendance.getUser() != null ? attendance.getUser().getId() : null;
        
        boolean canAccess = permissionService.canAccessItem(
                currentUserId, "Attendance", "view",
                null, attendanceUserId, null
        );
        
        if (!canAccess) {
            throw new ForbiddenException("You do not have permission to view this attendance");
        }

        return mapToResponse(attendance);
    }

    public List<AttendanceResponse> getAttendanceByUserId(Long userId) {
        return attendanceRepository.findByUserId(userId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<AttendanceResponse> getAttendanceByMonth(Long userId, int year, int month) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());
        
        // Get all holidays in the date range
        List<Holiday> holidays = holidayRepository.findByDateBetween(startDate, endDate);
        
        // Get all approved leaves for this user in the date range
        List<Leave> approvedLeaves = leaveRepository.findByUserIdAndDateRange(userId, startDate, endDate).stream()
                .filter(leave -> "APPROVED".equals(leave.getStatus()))
                .collect(Collectors.toList());
        
        // Create a set of dates that are on leave
        java.util.Set<LocalDate> leaveDates = new java.util.HashSet<>();
        for (Leave leave : approvedLeaves) {
            LocalDate leaveStart = leave.getStartDate();
            LocalDate leaveEnd = leave.getEndDate();
            LocalDate currentLeaveDate = leaveStart;
            while (!currentLeaveDate.isAfter(leaveEnd)) {
                // Only add leave dates that are within the month range
                if (!currentLeaveDate.isBefore(startDate) && !currentLeaveDate.isAfter(endDate)) {
                    leaveDates.add(currentLeaveDate);
                }
                currentLeaveDate = currentLeaveDate.plusDays(1);
            }
        }
        
        // Get existing attendance records
        List<Attendance> existingAttendance = attendanceRepository.findByUserIdAndMonth(userId, year, month);
        
        // Create a map of existing attendance by date for quick lookup
        java.util.Map<LocalDate, Attendance> attendanceMap = existingAttendance.stream()
                .collect(Collectors.toMap(Attendance::getAttendanceDate, a -> a));
        
        // Generate attendance responses for all days in the month
        List<AttendanceResponse> responses = new ArrayList<>();
        LocalDate currentDate = startDate;
        
        while (!currentDate.isAfter(endDate)) {
            Attendance attendance = attendanceMap.get(currentDate);
            
            // Check if this date is a holiday for this employee
            boolean isHoliday = false;
            for (Holiday holiday : holidays) {
                if (holiday.getDate().equals(currentDate) && holidayService.isHolidayApplicableToEmployee(holiday, user)) {
                    isHoliday = true;
                    break;
                }
            }
            
            // Check if it's a Sunday
            boolean isSunday = currentDate.getDayOfWeek().getValue() == 7; // Sunday = 7
            
            // Check if this date is on approved leave
            boolean isOnLeave = leaveDates.contains(currentDate);
            
            if (attendance != null) {
                // If there's an existing attendance record, use it but override status based on priority:
                // Holiday/Sunday > Leave > Actual attendance
                AttendanceResponse response = mapToResponse(attendance);
                if (isHoliday || isSunday) {
                    // Holiday/Sunday takes highest precedence
                    response.setStatus(AttendanceStatus.HOLIDAY.name());
                } else if (isOnLeave) {
                    // Leave takes precedence over actual attendance
                    response.setStatus(AttendanceStatus.ON_LEAVE.name());
                }
                responses.add(response);
            } else {
                // No attendance record exists - create a virtual one for holidays/Sundays/leaves
                if (isHoliday || isSunday) {
                    AttendanceResponse response = new AttendanceResponse();
                    response.setUserId(userId);
                    response.setUserName(user.getFullName());
                    // Convert file path to API URL for frontend access
                    response.setProfilePictureUrl(com.dashboard.app.util.FileUrlUtil.convertFilePathToUrl(user.getProfilePictureUrl()));
                    response.setAttendanceDate(currentDate);
                    response.setStatus(AttendanceStatus.HOLIDAY.name());
                    responses.add(response);
                } else if (isOnLeave) {
                    AttendanceResponse response = new AttendanceResponse();
                    response.setUserId(userId);
                    response.setUserName(user.getFullName());
                    // Convert file path to API URL for frontend access
                    response.setProfilePictureUrl(com.dashboard.app.util.FileUrlUtil.convertFilePathToUrl(user.getProfilePictureUrl()));
                    response.setAttendanceDate(currentDate);
                    response.setStatus(AttendanceStatus.ON_LEAVE.name());
                    responses.add(response);
                }
            }
            
            currentDate = currentDate.plusDays(1);
        }
        
        return responses;
    }

    @Cacheable(value = "attendance", key = "#year + '_' + #month + '_' + #currentUserId")
    public List<AttendanceResponse> getAllAttendanceByMonth(int year, int month, Long currentUserId) {
        if (currentUserId == null) {
            return new ArrayList<>();
        }

        String viewPermission = permissionService.getModulePermission(currentUserId, "Attendance", "view");
        
        // If no permission, return empty list
        if ("None".equals(viewPermission)) {
            return new ArrayList<>();
        }

        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());
        
        // Get all holidays in the date range
        List<Holiday> holidays = holidayRepository.findByDateBetween(startDate, endDate);
        
        // OPTIMIZED: Use JOIN FETCH to avoid N+1 queries
        List<Attendance> allAttendance = attendanceRepository.findByAttendanceDateBetweenWithUser(startDate, endDate);
        
        // Create a map of attendance by user and date for quick lookup
        java.util.Map<Long, java.util.Map<LocalDate, Attendance>> attendanceByUser = allAttendance.stream()
                .collect(Collectors.groupingBy(
                    a -> a.getUser().getId(),
                    Collectors.toMap(Attendance::getAttendanceDate, a -> a)
                ));
        
        // Get all users who have attendance or should have attendance (for holidays)
        java.util.Set<Long> userIds = new java.util.HashSet<>(attendanceByUser.keySet());
        
        // OPTIMIZED: Use optimized query to get active user IDs only (not full user objects)
        if ("All".equals(viewPermission)) {
            List<Long> activeUserIds = userRepository.findActiveUserIds();
            userIds.addAll(activeUserIds);
        } else {
            // For non-"All" permissions, ensure current user is included to see their own holidays
            userIds.add(currentUserId);
        }
        
        // OPTIMIZED: Batch load all users at once instead of one-by-one
        java.util.Map<Long, User> userMap = userRepository.findAllByIdWithRelations(userIds)
                .stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        
        // Get all approved leaves for all users in the date range
        List<Leave> allApprovedLeaves = leaveRepository.findByDateRange(startDate, endDate).stream()
                .filter(leave -> "APPROVED".equals(leave.getStatus()))
                .collect(Collectors.toList());
        
        // Create a map of leave dates by user
        java.util.Map<Long, java.util.Set<LocalDate>> leaveDatesByUser = new java.util.HashMap<>();
        for (Leave leave : allApprovedLeaves) {
            Long leaveUserId = leave.getUser().getId();
            leaveDatesByUser.putIfAbsent(leaveUserId, new java.util.HashSet<>());
            java.util.Set<LocalDate> userLeaveDates = leaveDatesByUser.get(leaveUserId);
            LocalDate leaveStart = leave.getStartDate();
            LocalDate leaveEnd = leave.getEndDate();
            LocalDate currentLeaveDate = leaveStart;
            while (!currentLeaveDate.isAfter(leaveEnd)) {
                if (!currentLeaveDate.isBefore(startDate) && !currentLeaveDate.isAfter(endDate)) {
                    userLeaveDates.add(currentLeaveDate);
                }
                currentLeaveDate = currentLeaveDate.plusDays(1);
            }
        }
        
        List<AttendanceResponse> responses = new ArrayList<>();
        
        // OPTIMIZED: Process users from the map instead of querying one-by-one
        for (Long userId : userIds) {
            User user = userMap.get(userId);
            if (user == null) continue;
            
            // Check permission for this user's attendance
            // For attendance, "Owned" means the attendance belongs to the user (attendance.user.id)
            // "Added" doesn't apply to attendance as it doesn't track who created it
            // So we pass itemAssignedTo = userId to check "Owned" permission
            if (!"All".equals(viewPermission)) {
                if (!permissionService.canAccessItem(
                        currentUserId, "Attendance", "view",
                        null, userId, null
                )) {
                    continue;
                }
            }
            
            // Get existing attendance for this user
            java.util.Map<LocalDate, Attendance> userAttendance = attendanceByUser.getOrDefault(userId, new java.util.HashMap<>());
            
            // Get leave dates for this user
            java.util.Set<LocalDate> userLeaveDates = leaveDatesByUser.getOrDefault(userId, new java.util.HashSet<>());
            
            // Generate responses for all days in the month
            LocalDate currentDate = startDate;
            while (!currentDate.isAfter(endDate)) {
                Attendance attendance = userAttendance.get(currentDate);
                
                // Check if this date is a holiday for this employee
                boolean isHoliday = false;
                for (Holiday holiday : holidays) {
                    if (holiday.getDate().equals(currentDate) && holidayService.isHolidayApplicableToEmployee(holiday, user)) {
                        isHoliday = true;
                        break;
                    }
                }
                
                // Check if it's a Sunday
                boolean isSunday = currentDate.getDayOfWeek().getValue() == 7; // Sunday = 7
                
                // Check if this date is on approved leave
                boolean isOnLeave = userLeaveDates.contains(currentDate);
                
                if (attendance != null) {
                    // If there's an existing attendance record, use it but override status based on priority:
                    // Holiday/Sunday > Leave > Actual attendance
                    AttendanceResponse response = mapToResponse(attendance);
                    if (isHoliday || isSunday) {
                        // Holiday/Sunday takes highest precedence
                        response.setStatus(AttendanceStatus.HOLIDAY.name());
                    } else if (isOnLeave) {
                        // Leave takes precedence over actual attendance
                        response.setStatus(AttendanceStatus.ON_LEAVE.name());
                    }
                    responses.add(response);
                } else {
                    // No attendance record exists - create a virtual one for holidays/Sundays/leaves
                    if (isHoliday || isSunday) {
                        AttendanceResponse response = new AttendanceResponse();
                        response.setUserId(userId);
                        response.setUserName(user.getFullName());
                        // Convert file path to API URL for frontend access
                        response.setProfilePictureUrl(com.dashboard.app.util.FileUrlUtil.convertFilePathToUrl(user.getProfilePictureUrl()));
                        response.setAttendanceDate(currentDate);
                        response.setStatus(AttendanceStatus.HOLIDAY.name());
                        responses.add(response);
                    } else if (isOnLeave) {
                        AttendanceResponse response = new AttendanceResponse();
                        response.setUserId(userId);
                        response.setUserName(user.getFullName());
                        // Convert file path to API URL for frontend access
                        response.setProfilePictureUrl(com.dashboard.app.util.FileUrlUtil.convertFilePathToUrl(user.getProfilePictureUrl()));
                        response.setAttendanceDate(currentDate);
                        response.setStatus(AttendanceStatus.ON_LEAVE.name());
                        responses.add(response);
                    }
                }
                
                currentDate = currentDate.plusDays(1);
            }
        }
        
        return responses;
    }

    @CacheEvict(value = "attendance", allEntries = true)
    public List<AttendanceResponse> markBulkAttendance(BulkAttendanceRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        // Check if user has add permission
        String addPermission = permissionService.getModulePermission(currentUserId, "Attendance", "add");
        if ("None".equals(addPermission)) {
            throw new ForbiddenException("You do not have permission to mark bulk attendance");
        }

        // If overwrite is enabled, check delete or update permission
        final String deletePermission;
        final String updatePermission;
        if (request.getAttendanceOverwrite() != null && request.getAttendanceOverwrite()) {
            deletePermission = permissionService.getModulePermission(currentUserId, "Attendance", "delete");
            updatePermission = permissionService.getModulePermission(currentUserId, "Attendance", "update");
            
            // For overwrite, user needs either "All" add permission, or delete/update permission
            if (!"All".equals(addPermission) && "None".equals(deletePermission) && "None".equals(updatePermission)) {
                throw new ForbiddenException("You do not have permission to overwrite attendance. Delete or Update permission is required.");
            }
        } else {
            deletePermission = null;
            updatePermission = null;
        }

        List<AttendanceResponse> responses = new ArrayList<>();
        final String finalAddPermission = addPermission; // Make effectively final for lambda
        
        for (Long employeeId : request.getEmployeeIds()) {
            // If permission is "Added" or "Owned", user can only mark attendance for themselves
            if (!"All".equals(addPermission) && !employeeId.equals(currentUserId)) {
                throw new ForbiddenException("You can only mark attendance for yourself");
            }
            User user = userRepository.findById(employeeId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + employeeId));
            
            List<LocalDate> dates = getDateRange(request);
            
            for (LocalDate date : dates) {
                // Check if attendance already exists
                Optional<Attendance> existingAttendanceOpt = attendanceRepository.findByUserIdAndAttendanceDate(employeeId, date);
                
                if (existingAttendanceOpt.isPresent()) {
                    // Attendance exists - check if we can overwrite
                    if (request.getAttendanceOverwrite() != null && request.getAttendanceOverwrite()) {
                        // Delete existing attendance if overwrite is enabled
                        Attendance existingAttendance = existingAttendanceOpt.get();
                        
                        // If user has "All" add permission, they can overwrite any attendance
                        if ("All".equals(finalAddPermission)) {
                            attendanceRepository.delete(existingAttendance);
                            entityManager.flush(); // Ensure delete is committed before insert
                        } else {
                            // For other permissions, check delete or update permission
                            final String finalDeletePermission = deletePermission;
                            final String finalUpdatePermission = updatePermission;
                            Long attendanceUserId = existingAttendance.getUser() != null ? existingAttendance.getUser().getId() : null;
                            
                            // Check if user can delete this attendance
                            boolean canDelete = false;
                            if (finalDeletePermission != null && !"None".equals(finalDeletePermission)) {
                                if ("All".equals(finalDeletePermission)) {
                                    canDelete = true;
                                } else {
                                    canDelete = permissionService.canAccessItem(
                                            currentUserId, "Attendance", "delete",
                                            attendanceUserId, null, null
                                    );
                                }
                            }
                            
                            // If can't delete, check update permission
                            if (!canDelete && finalUpdatePermission != null && !"None".equals(finalUpdatePermission)) {
                                if ("All".equals(finalUpdatePermission)) {
                                    canDelete = true;
                                } else {
                                    canDelete = permissionService.canAccessItem(
                                            currentUserId, "Attendance", "update",
                                            attendanceUserId, null, null
                                    );
                                }
                            }
                            
                            if (canDelete) {
                                attendanceRepository.delete(existingAttendance);
                                entityManager.flush(); // Ensure delete is committed before insert
                            } else {
                                throw new ForbiddenException("You do not have permission to overwrite attendance for this employee");
                            }
                        }
                    } else {
                        // Overwrite not enabled, skip this date
                        continue;
                    }
                }
                
                // Create new attendance (or update if we deleted the existing one)
                Attendance attendance = new Attendance();
                attendance.setUser(user);
                attendance.setAttendanceDate(date);
                
                // Determine status based on flags and shift
                AttendanceStatus status;
                if (request.getHalfDay()) {
                    status = AttendanceStatus.HALF_DAY;
                } else if (request.getLate()) {
                    status = AttendanceStatus.LATE;
                } else if (request.getClockIn() != null) {
                    // If clockIn is provided, use shift-based status calculation
                    // This respects the employee's assigned shift
                    status = resolveAttendanceStatus(user, date, request.getClockIn());
                } else {
                    // Default to PRESENT if no clockIn time
                    status = AttendanceStatus.PRESENT;
                }
                
                attendance.setStatus(status);
                attendance.setClockIn(request.getClockIn());
                attendance.setClockOut(request.getClockOut());
                attendance.setNotes(request.getNotes());
                
                if (request.getClockIn() != null && request.getClockOut() != null) {
                    Duration duration = Duration.between(request.getClockIn(), request.getClockOut());
                    attendance.setDurationMinutes(duration.toMinutes());
                    
                    if (request.getHalfDay()) {
                        attendance.setDurationMinutes(attendance.getDurationMinutes() / 2);
                    }
                }
                
                attendance.setBreakMinutes(0L);
                
                Attendance saved = attendanceRepository.save(attendance);
                responses.add(mapToResponse(saved));
            }
        }
        
        return responses;
    }

    @CacheEvict(value = "attendance", allEntries = true)
    public void deleteAttendance(Long id, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Attendance attendance = attendanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance not found"));

        // Check if user has delete permission
        String deletePermission = permissionService.getModulePermission(currentUserId, "Attendance", "delete");
        if ("None".equals(deletePermission)) {
            throw new ForbiddenException("You do not have permission to delete attendance");
        }

        // If permission is "Added" or "Owned", check ownership
        if (!"All".equals(deletePermission)) {
            Long attendanceUserId = attendance.getUser() != null ? attendance.getUser().getId() : null;
            boolean canAccess = permissionService.canAccessItem(
                    currentUserId, "Attendance", "delete",
                    attendanceUserId, null, null
            );
            if (!canAccess) {
                throw new ForbiddenException("You do not have permission to delete this attendance");
            }
        }

        attendanceRepository.deleteById(id);
    }

    private List<LocalDate> getDateRange(BulkAttendanceRequest request) {
        List<LocalDate> dates = new ArrayList<>();
        
        if ("month".equals(request.getMarkBy())) {
            LocalDate startDate = LocalDate.of(request.getYear(), request.getMonth(), 1);
            LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());
            
            LocalDate current = startDate;
            while (!current.isAfter(endDate)) {
                dates.add(current);
                current = current.plusDays(1);
            }
        } else if ("date".equals(request.getMarkBy())) {
            LocalDate current = request.getFromDate();
            while (!current.isAfter(request.getToDate())) {
                dates.add(current);
                current = current.plusDays(1);
            }
        }
        
        return dates;
    }

    private AttendanceStatus resolveAttendanceStatus(User user, LocalDate date, LocalTime clockInTime) {
        ShiftAssignment assignment = shiftAssignmentRepository
                .findByUserIdAndShiftDate(user.getId(), date)
                .orElse(null);

        Shift shift = assignment != null ? assignment.getShift() : null;
        if (shift == null) {
            shift = shiftRepository.findFirstByNameIgnoreCase("General Shift")
                    .or(() -> shiftRepository.findTopByOrderByIdAsc())
                    .orElse(null);
        }

        if (shift == null) {
            return AttendanceStatus.PRESENT;
        }

        LocalTime graceLimit = shift.getStartTime()
                .plusMinutes(shift.getGraceMinutes() != null ? shift.getGraceMinutes() : 0);

        return clockInTime.isAfter(graceLimit) ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
    }

    private AttendanceResponse mapToResponse(Attendance attendance) {
        AttendanceResponse response = new AttendanceResponse();
        response.setId(attendance.getId());
        response.setUserId(attendance.getUser().getId());
        response.setUserName(attendance.getUser().getFullName());
        // Convert file path to API URL for frontend access
        response.setProfilePictureUrl(com.dashboard.app.util.FileUrlUtil.convertFilePathToUrl(attendance.getUser().getProfilePictureUrl()));
        response.setAttendanceDate(attendance.getAttendanceDate());
        // Ensure status is always set - status should never be null, but add safeguard
        if (attendance.getStatus() != null) {
            response.setStatus(attendance.getStatus().name());
        } else {
            // If status is somehow null, determine based on clockIn and shift
            if (attendance.getClockIn() != null) {
                // Recalculate status based on shift if status is missing
                AttendanceStatus calculatedStatus = resolveAttendanceStatus(
                    attendance.getUser(), 
                    attendance.getAttendanceDate(), 
                    attendance.getClockIn()
                );
                response.setStatus(calculatedStatus.name());
            } else {
                response.setStatus(AttendanceStatus.ABSENT.name());
            }
        }
        response.setClockIn(attendance.getClockIn());
        response.setClockOut(attendance.getClockOut());
        response.setDurationMinutes(attendance.getDurationMinutes());
        response.setBreakMinutes(attendance.getBreakMinutes());
        response.setNotes(attendance.getNotes());
        
        // Location fields
        response.setClockInLatitude(attendance.getClockInLatitude());
        response.setClockInLongitude(attendance.getClockInLongitude());
        response.setClockInLocation(attendance.getClockInLocation());
        response.setClockInWorkingFrom(attendance.getClockInWorkingFrom());
        response.setClockOutLatitude(attendance.getClockOutLatitude());
        response.setClockOutLongitude(attendance.getClockOutLongitude());
        response.setClockOutLocation(attendance.getClockOutLocation());
        response.setClockOutWorkingFrom(attendance.getClockOutWorkingFrom());
        
        response.setCreatedAt(attendance.getCreatedAt());
        return response;
    }
    
    public List<AttendanceLocationResponse> getTodayAttendanceLocationsForMap(Long userId, boolean isAdmin) {
        LocalDate today = getTodayInUtc();
        List<Attendance> attendances;
        
        // Check if user has "All" view permission
        String viewPermission = permissionService.getModulePermission(userId, "Attendance", "view");
        boolean hasAllPermission = "All".equals(viewPermission);
        
        if (isAdmin || hasAllPermission) {
            // OPTIMIZED: Use EntityGraph to avoid N+1 queries
            // Admin or users with "All" permission see all employees' attendance for today
            attendances = attendanceRepository.findByAttendanceDateWithUser(today);
        } else {
            // Employee sees only their own attendance for today
            attendances = attendanceRepository.findByUserIdAndAttendanceDate(userId, today)
                    .map(List::of)
                    .orElse(List.of());
        }
        
        // Return all attendances for today (not just those with location)
        // This allows the dashboard to show all clocked-in employees
        // The frontend will filter for location-based map display
        // Note: For map view, only entries with location will be displayed
        List<AttendanceLocationResponse> result = attendances.stream()
                .filter(a -> a.getClockIn() != null) // Only include those who have clocked in
                .map(this::mapToLocationResponse)
                .collect(Collectors.toList());
        return result;
    }
    
    /**
     * Get today's clocked-in employees for dashboard display.
     * All employees can see the list of who has clocked in today (for dashboard only).
     * This is separate from the map view which has permission restrictions.
     */
    public List<AttendanceLocationResponse> getTodayClockedInForDashboard() {
        LocalDate today = getTodayInUtc();
        
        // OPTIMIZED: Use EntityGraph to avoid N+1 queries
        // All employees can see who has clocked in today for dashboard display
        List<Attendance> attendances = attendanceRepository.findByAttendanceDateWithUser(today);
        
        // Return all attendances for today (not just those with location)
        // This allows the dashboard to show all clocked-in employees
        List<AttendanceLocationResponse> result = attendances.stream()
                .filter(a -> a.getClockIn() != null) // Only include those who have clocked in
                .map(this::mapToLocationResponse)
                .collect(Collectors.toList());
        return result;
    }
    
    private AttendanceLocationResponse mapToLocationResponse(Attendance attendance) {
        AttendanceLocationResponse response = new AttendanceLocationResponse();
        response.setId(attendance.getId());
        response.setUserId(attendance.getUser().getId());
        response.setUserName(attendance.getUser().getFullName());
        // Convert file path to API URL for frontend access
        response.setProfilePictureUrl(com.dashboard.app.util.FileUrlUtil.convertFilePathToUrl(attendance.getUser().getProfilePictureUrl()));
        response.setAttendanceDate(attendance.getAttendanceDate());
        response.setClockIn(attendance.getClockIn());
        response.setClockOut(attendance.getClockOut());
        response.setClockInLatitude(attendance.getClockInLatitude());
        response.setClockInLongitude(attendance.getClockInLongitude());
        response.setClockInLocation(attendance.getClockInLocation());
        response.setClockInWorkingFrom(attendance.getClockInWorkingFrom());
        response.setClockOutLatitude(attendance.getClockOutLatitude());
        response.setClockOutLongitude(attendance.getClockOutLongitude());
        response.setClockOutLocation(attendance.getClockOutLocation());
        response.setClockOutWorkingFrom(attendance.getClockOutWorkingFrom());
        return response;
    }
    
    public List<AttendanceResponse> getTodayAttendanceWithLocations(Long userId, boolean isAdmin) {
        LocalDate today = getTodayInUtc();
        List<Attendance> attendances;
        
        if (isAdmin) {
            // OPTIMIZED: Use EntityGraph to avoid N+1 queries
            // Admin sees all employees' attendance for today
            attendances = attendanceRepository.findByAttendanceDateWithUser(today);
        } else {
            // Employee sees only their own attendance for today
            attendances = attendanceRepository.findByUserIdAndAttendanceDate(userId, today)
                    .map(List::of)
                    .orElse(List.of());
        }
        
        // Filter to only include attendances with location data
        return attendances.stream()
                .filter(a -> a.getClockInLatitude() != null && a.getClockInLongitude() != null)
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
}

