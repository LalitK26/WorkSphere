package com.dashboard.app.service;

import com.dashboard.app.dto.request.HolidayRequest;
import com.dashboard.app.dto.response.HolidayResponse;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ForbiddenException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.Holiday;
import com.dashboard.app.model.User;
import com.dashboard.app.model.enums.RoleType;
import com.dashboard.app.repository.HolidayRepository;
import com.dashboard.app.repository.UserRepository;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class HolidayService {

    private static final Logger logger = LoggerFactory.getLogger(HolidayService.class);

    @Autowired
    private HolidayRepository holidayRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private DashboardEmailService dashboardEmailService;

    public HolidayResponse createHoliday(HolidayRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        // Check if user has add permission
        String addPermission = permissionService.getModulePermission(currentUserId, "Holidays", "add");
        if ("None".equals(addPermission)) {
            throw new ForbiddenException("You do not have permission to create holidays");
        }

        // For reference data like holidays, only "All" permission allows creation
        if (!"All".equals(addPermission)) {
            throw new ForbiddenException("You do not have permission to create holidays");
        }

        Holiday holiday = new Holiday();
        holiday.setDate(request.getDate());
        holiday.setOccasion(request.getOccasion().trim());
        holiday.setIsCommon(request.getIsCommon() != null && request.getIsCommon());

        // Convert lists to comma-separated strings
        if (request.getDepartments() != null && !request.getDepartments().isEmpty()) {
            holiday.setDepartments(String.join(",", request.getDepartments()));
        }
        if (request.getDesignations() != null && !request.getDesignations().isEmpty()) {
            holiday.setDesignations(request.getDesignations().stream()
                    .map(String::valueOf)
                    .collect(Collectors.joining(",")));
        }
        if (request.getEmploymentTypes() != null && !request.getEmploymentTypes().isEmpty()) {
            holiday.setEmploymentTypes(String.join(",", request.getEmploymentTypes()));
        }

        Holiday saved = holidayRepository.save(holiday);
        
        // Send holiday announcement emails to applicable employees
        sendHolidayAnnouncementEmails(saved);
        
        return mapToResponse(saved);
    }
    
    /**
     * Send holiday announcement emails to all applicable employees
     */
    private void sendHolidayAnnouncementEmails(Holiday holiday) {
        try {
            List<User> allUsers = userRepository.findAll();
            
            for (User user : allUsers) {
                // Check if holiday is applicable to this user
                if (isHolidayApplicableToEmployee(holiday, user)) {
                    if (user.getEmail() != null) {
                        try {
                            dashboardEmailService.sendHolidayAnnouncementNotification(
                                user.getEmail(),
                                user.getFullName(),
                                holiday.getOccasion(),
                                holiday.getDate(),
                                Boolean.TRUE.equals(holiday.getIsCommon()),
                                holiday.getId()
                            );
                            logger.info("Holiday announcement sent to: {}", user.getEmail());
                        } catch (Exception e) {
                            logger.error("Failed to send holiday announcement to {}: {}", user.getEmail(), e.getMessage());
                        }
                    }
                }
            }
        } catch (Exception e) {
            logger.error("Failed to send holiday announcement emails: {}", e.getMessage(), e);
        }
    }

    public HolidayResponse updateHoliday(Long id, HolidayRequest request, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Holiday holiday = holidayRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Holiday not found"));

        // Check if user has update permission
        String updatePermission = permissionService.getModulePermission(currentUserId, "Holidays", "update");
        if ("None".equals(updatePermission)) {
            throw new ForbiddenException("You do not have permission to update holidays");
        }

        // For reference data like holidays, only "All" permission allows update
        if (!"All".equals(updatePermission)) {
            throw new ForbiddenException("You do not have permission to update holidays");
        }

        holiday.setDate(request.getDate());
        holiday.setOccasion(request.getOccasion().trim());
        holiday.setIsCommon(request.getIsCommon() != null && request.getIsCommon());

        // Convert lists to comma-separated strings
        if (request.getDepartments() != null && !request.getDepartments().isEmpty()) {
            holiday.setDepartments(String.join(",", request.getDepartments()));
        } else {
            holiday.setDepartments(null);
        }
        if (request.getDesignations() != null && !request.getDesignations().isEmpty()) {
            holiday.setDesignations(request.getDesignations().stream()
                    .map(String::valueOf)
                    .collect(Collectors.joining(",")));
        } else {
            holiday.setDesignations(null);
        }
        if (request.getEmploymentTypes() != null && !request.getEmploymentTypes().isEmpty()) {
            holiday.setEmploymentTypes(String.join(",", request.getEmploymentTypes()));
        } else {
            holiday.setEmploymentTypes(null);
        }

        Holiday updated = holidayRepository.save(holiday);
        return mapToResponse(updated);
    }

    public HolidayResponse getHolidayById(Long id, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Holiday holiday = holidayRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Holiday not found"));

        // Check if user has view permission
        String viewPermission = permissionService.getModulePermission(currentUserId, "Holidays", "view");
        if ("None".equals(viewPermission)) {
            throw new ForbiddenException("You do not have permission to view holidays");
        }

        // Holidays are reference data - if user has any view permission (All, Added, Owned, etc.), they can view
        // For "All" permission, allow access to all holidays
        // For other permissions, the getAllHolidays method already filters based on department/designation/employment type
        return mapToResponse(holiday);
    }

    public List<HolidayResponse> getAllHolidays(HttpServletRequest request, String search, LocalDate startDate, LocalDate endDate) {
        // Get current user from JWT token
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new ResourceNotFoundException("Authorization header not found");
        }
        
        Long userId = jwtUtil.extractUserId(authHeader.substring(7));
        if (userId == null) {
            return new java.util.ArrayList<>();
        }

        String viewPermission = permissionService.getModulePermission(userId, "Holidays", "view");
        
        // If no permission, return empty list
        if ("None".equals(viewPermission)) {
            return new java.util.ArrayList<>();
        }

        List<Holiday> holidays;
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        // Check if user is admin by role type (not just permission level)
        // Admins see all holidays, employees see only applicable holidays
        boolean isAdmin = user.getRole() != null && 
                        user.getRole().getType() != null && 
                        user.getRole().getType() == RoleType.ADMIN;
        
        if (isAdmin) {
            // Admin users see all holidays
            holidays = holidayRepository.findAll();
        } else {
            // For employees, filter holidays based on their department, designation, and employment type
            // This matches the attendance logic exactly
            holidays = filterHolidaysForEmployee(user);
        }

        // Apply date range filter if provided
        if (startDate != null && endDate != null) {
            holidays = holidays.stream()
                    .filter(h -> !h.getDate().isBefore(startDate) && !h.getDate().isAfter(endDate))
                    .collect(Collectors.toList());
        }

        // Apply search filter if provided
        if (StringUtils.hasText(search)) {
            String searchLower = search.toLowerCase();
            holidays = holidays.stream()
                    .filter(h -> h.getOccasion().toLowerCase().contains(searchLower))
                    .collect(Collectors.toList());
        }

        return holidays.stream()
                .map(this::mapToResponse)
                .sorted((h1, h2) -> h1.getDate().compareTo(h2.getDate()))
                .collect(Collectors.toList());
    }

    private List<Holiday> filterHolidaysForEmployee(User user) {
        List<Holiday> allHolidays = holidayRepository.findAll();
        List<Holiday> filteredHolidays = new ArrayList<>();

        for (Holiday holiday : allHolidays) {
            if (isHolidayApplicableToEmployee(holiday, user)) {
                filteredHolidays.add(holiday);
            }
        }

        return filteredHolidays;
    }

    /**
     * Check if a holiday applies to a specific employee based on the rules:
     * - If isCommon is true, applies to all employees
     * - If only departments are selected, applies to employees in those departments
     * - If only designations are selected, applies to employees with those designations
     * - If both departments AND designations are selected, applies only to employees matching BOTH (AND logic)
     * - Empty/null means "do not filter by this field"
     */
    public boolean isHolidayApplicableToEmployee(Holiday holiday, User user) {
        // If it's a common holiday, it applies to everyone
        if (Boolean.TRUE.equals(holiday.getIsCommon())) {
            return true;
        }

        String userDepartment = user.getDepartment();
        Long userDesignationId = user.getDesignation() != null ? user.getDesignation().getId() : null;
        String userEmploymentType = user.getEmploymentType();

        boolean hasDepartmentFilter = holiday.getDepartments() != null && !holiday.getDepartments().trim().isEmpty();
        boolean hasDesignationFilter = holiday.getDesignations() != null && !holiday.getDesignations().trim().isEmpty();
        boolean hasEmploymentTypeFilter = holiday.getEmploymentTypes() != null && !holiday.getEmploymentTypes().trim().isEmpty();

        // If no filters are set, holiday doesn't apply (only common holidays apply to all)
        if (!hasDepartmentFilter && !hasDesignationFilter && !hasEmploymentTypeFilter) {
            return false;
        }

        // Check department match
        boolean matchesDepartment = true; // Default to true if no department filter
        if (hasDepartmentFilter) {
            if (userDepartment == null) {
                matchesDepartment = false;
            } else {
                List<String> holidayDepartments = Arrays.asList(holiday.getDepartments().split(","));
                matchesDepartment = holidayDepartments.stream()
                        .map(String::trim)
                        .anyMatch(dept -> dept.equalsIgnoreCase(userDepartment));
            }
        }

        // Check designation match
        boolean matchesDesignation = true; // Default to true if no designation filter
        if (hasDesignationFilter) {
            if (userDesignationId == null) {
                matchesDesignation = false;
            } else {
                List<Long> holidayDesignations = Arrays.stream(holiday.getDesignations().split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .map(Long::parseLong)
                        .collect(Collectors.toList());
                matchesDesignation = holidayDesignations.contains(userDesignationId);
            }
        }

        // Check employment type match
        boolean matchesEmploymentType = true; // Default to true if no employment type filter
        if (hasEmploymentTypeFilter) {
            if (userEmploymentType == null) {
                matchesEmploymentType = false;
            } else {
                List<String> holidayEmploymentTypes = Arrays.asList(holiday.getEmploymentTypes().split(","));
                matchesEmploymentType = holidayEmploymentTypes.stream()
                        .map(String::trim)
                        .anyMatch(et -> et.equalsIgnoreCase(userEmploymentType));
            }
        }

        // All specified filters must match (AND logic)
        return matchesDepartment && matchesDesignation && matchesEmploymentType;
    }

    public void deleteHoliday(Long id, Long currentUserId) {
        if (currentUserId == null) {
            throw new BadRequestException("User not authenticated");
        }

        if (!holidayRepository.existsById(id)) {
            throw new ResourceNotFoundException("Holiday not found");
        }

        // Check if user has delete permission
        String deletePermission = permissionService.getModulePermission(currentUserId, "Holidays", "delete");
        if ("None".equals(deletePermission)) {
            throw new ForbiddenException("You do not have permission to delete holidays");
        }

        // For reference data like holidays, only "All" permission allows deletion
        if (!"All".equals(deletePermission)) {
            throw new ForbiddenException("You do not have permission to delete holidays");
        }

        holidayRepository.deleteById(id);
    }

    private HolidayResponse mapToResponse(Holiday holiday) {
        HolidayResponse response = new HolidayResponse();
        response.setId(holiday.getId());
        response.setDate(holiday.getDate());
        response.setOccasion(holiday.getOccasion());
        response.setIsCommon(holiday.getIsCommon());
        response.setCreatedAt(holiday.getCreatedAt());
        response.setUpdatedAt(holiday.getUpdatedAt());

        // Convert comma-separated strings to lists
        if (holiday.getDepartments() != null && !holiday.getDepartments().isEmpty()) {
            response.setDepartments(Arrays.asList(holiday.getDepartments().split(",")));
        } else {
            response.setDepartments(new ArrayList<>());
        }

        if (holiday.getDesignations() != null && !holiday.getDesignations().isEmpty()) {
            response.setDesignations(Arrays.stream(holiday.getDesignations().split(","))
                    .map(Long::parseLong)
                    .collect(Collectors.toList()));
        } else {
            response.setDesignations(new ArrayList<>());
        }

        if (holiday.getEmploymentTypes() != null && !holiday.getEmploymentTypes().isEmpty()) {
            response.setEmploymentTypes(Arrays.asList(holiday.getEmploymentTypes().split(",")));
        } else {
            response.setEmploymentTypes(new ArrayList<>());
        }

        return response;
    }
}

