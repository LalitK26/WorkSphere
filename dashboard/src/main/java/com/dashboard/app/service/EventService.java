package com.dashboard.app.service;

import com.dashboard.app.dto.EventDto;
import com.dashboard.app.dto.request.EventRequest;
import com.dashboard.app.dto.response.DepartmentResponse;
import com.dashboard.app.dto.response.EmployeeResponse;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ForbiddenException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.Department;
import com.dashboard.app.model.Event;
import com.dashboard.app.model.User;
import com.dashboard.app.repository.DepartmentRepository;
import com.dashboard.app.repository.EventRepository;
import com.dashboard.app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class EventService {

    private static final Logger logger = LoggerFactory.getLogger(EventService.class);

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private DepartmentRepository departmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private DashboardEmailService dashboardEmailService;

    public EventDto createEvent(EventRequest request, Long userId) {
        // Check if user has add permission
        String addPermission = permissionService.getModulePermission(userId, "Events", "add");
        if ("None".equals(addPermission)) {
            throw new ForbiddenException("You do not have permission to create events");
        }

        validateEventDates(request);

        Event event = new Event();
        mapRequestToEntity(request, event);

        // Set created by
        User createdBy = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        event.setCreatedBy(createdBy);

        Event saved = eventRepository.save(event);
        
        // Send email notifications to assigned employees
        if (saved.getEmployees() != null && !saved.getEmployees().isEmpty()) {
            for (User employee : saved.getEmployees()) {
                try {
                    if (employee.getEmail() != null) {
                        dashboardEmailService.sendEventCreatedNotification(
                            employee.getEmail(),
                            employee.getFullName(),
                            saved.getEventName(),
                            saved.getStartsOnDate(),
                            saved.getStartsOnTime(),
                            saved.getWhere(),
                            saved.getDescription(),
                            createdBy.getFullName(),
                            saved.getId()
                        );
                        logger.info("Event notification sent to: {}", employee.getEmail());
                    }
                } catch (Exception e) {
                    logger.error("Failed to send event notification to {}: {}", employee.getEmail(), e.getMessage(), e);
                }
            }
        }
        
        return convertToDto(saved);
    }

    public EventDto updateEvent(Long id, EventRequest request, Long userId) {
        if (userId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        // Check if user has update permission
        String updatePermission = permissionService.getModulePermission(userId, "Events", "update");
        if ("None".equals(updatePermission)) {
            throw new ForbiddenException("You do not have permission to update events");
        }

        // If permission is "Added" or "Owned", check ownership
        if (!"All".equals(updatePermission)) {
            Long createdBy = event.getCreatedBy() != null ? event.getCreatedBy().getId() : null;
            List<Long> employeeIds = event.getEmployees() != null 
                    ? event.getEmployees().stream().map(User::getId).collect(Collectors.toList())
                    : new java.util.ArrayList<>();
            
            boolean canAccess = permissionService.canAccessItem(
                    userId, "Events", "update",
                    createdBy, null, employeeIds
            );
            if (!canAccess) {
                throw new ForbiddenException("You do not have permission to update this event");
            }
        }

        // Track existing employees before update
        Set<Long> existingEmployeeIds = event.getEmployees() != null 
                ? event.getEmployees().stream().map(User::getId).collect(Collectors.toSet())
                : new HashSet<>();

        validateEventDates(request);
        mapRequestToEntity(request, event);
        Event updated = eventRepository.save(event);
        
        // Send notification to newly added employees
        if (updated.getEmployees() != null && !updated.getEmployees().isEmpty()) {
            for (User employee : updated.getEmployees()) {
                if (!existingEmployeeIds.contains(employee.getId())) {
                    try {
                        if (employee.getEmail() != null) {
                            dashboardEmailService.sendEventAssignedNotification(
                                employee.getEmail(),
                                employee.getFullName(),
                                updated.getEventName(),
                                updated.getStartsOnDate(),
                                updated.getStartsOnTime(),
                                updated.getWhere(),
                                updated.getId()
                            );
                            logger.info("Event assignment notification sent to: {}", employee.getEmail());
                        }
                    } catch (Exception e) {
                        logger.error("Failed to send event assignment notification to {}: {}", employee.getEmail(), e.getMessage(), e);
                    }
                }
            }
        }
        
        return convertToDto(updated);
    }

    public void deleteEvent(Long id, Long userId) {
        if (userId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        // Check if user has delete permission
        String deletePermission = permissionService.getModulePermission(userId, "Events", "delete");
        if ("None".equals(deletePermission)) {
            throw new ForbiddenException("You do not have permission to delete events");
        }

        // If permission is "Added" or "Owned", check ownership
        if (!"All".equals(deletePermission)) {
            Long createdBy = event.getCreatedBy() != null ? event.getCreatedBy().getId() : null;
            List<Long> employeeIds = event.getEmployees() != null 
                    ? event.getEmployees().stream().map(User::getId).collect(Collectors.toList())
                    : new java.util.ArrayList<>();
            
            boolean canAccess = permissionService.canAccessItem(
                    userId, "Events", "delete",
                    createdBy, null, employeeIds
            );
            if (!canAccess) {
                throw new ForbiddenException("You do not have permission to delete this event");
            }
        }

        eventRepository.delete(event);
    }

    public EventDto getEventById(Long id, Long userId) {
        if (userId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        // Check if user has view permission
        String viewPermission = permissionService.getModulePermission(userId, "Events", "view");
        if ("None".equals(viewPermission)) {
            throw new ForbiddenException("You do not have permission to view events");
        }

        // If "All" permission, allow access
        if ("All".equals(viewPermission)) {
            return convertToDto(event);
        }

        // For other permissions, check ownership
        Long createdBy = event.getCreatedBy() != null ? event.getCreatedBy().getId() : null;
        List<Long> employeeIds = event.getEmployees() != null 
                ? event.getEmployees().stream().map(com.dashboard.app.model.User::getId).collect(Collectors.toList())
                : new java.util.ArrayList<>();
        
        boolean canAccess = permissionService.canAccessItem(
                userId, "Events", "view",
                createdBy, null, employeeIds
        );
        
        if (!canAccess) {
            throw new ForbiddenException("You do not have permission to view this event");
        }

        return convertToDto(event);
    }

    @Transactional(readOnly = true)
    public List<EventDto> getAllEvents(Long userId) {
        if (userId == null) {
            return new java.util.ArrayList<>();
        }

        String viewPermission = permissionService.getModulePermission(userId, "Events", "view");
        
        // If no permission, return empty list
        if ("None".equals(viewPermission)) {
            return new java.util.ArrayList<>();
        }
        
        // If "All" permission, return all events
        if ("All".equals(viewPermission)) {
            return eventRepository.findAllByOrderByStartsOnDateDescStartsOnTimeDesc().stream()
                    .map(this::convertToDto)
                    .collect(Collectors.toList());
        }
        
        // Filter based on permission level
        List<Event> allEvents = eventRepository.findAllByOrderByStartsOnDateDescStartsOnTimeDesc();
        
        return allEvents.stream()
                .filter(event -> {
                    Long createdBy = event.getCreatedBy() != null ? event.getCreatedBy().getId() : null;
                    List<Long> employeeIds = event.getEmployees() != null 
                            ? event.getEmployees().stream().map(com.dashboard.app.model.User::getId).collect(Collectors.toList())
                            : new java.util.ArrayList<>();
                    
                    // For events: createdBy = person who created, employees = assigned to
                    return permissionService.canAccessItem(
                            userId, "Events", "view",
                            createdBy, null, employeeIds
                    );
                })
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    private void mapRequestToEntity(EventRequest request, Event event) {
        event.setEventName(request.getEventName());
        event.setWhere(request.getWhere());
        event.setDescription(request.getDescription());
        event.setStartsOnDate(request.getStartsOnDate());
        event.setStartsOnTime(request.getStartsOnTime());
        event.setEndsOnDate(request.getEndsOnDate());
        event.setEndsOnTime(request.getEndsOnTime());
        event.setStatus(request.getStatus());
        event.setEventLink(request.getEventLink());

        // Set departments
        Set<Department> departments = new HashSet<>();
        if (request.getDepartmentIds() != null && !request.getDepartmentIds().isEmpty()) {
            departments = request.getDepartmentIds().stream()
                    .map(deptId -> departmentRepository.findById(deptId)
                            .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + deptId)))
                    .collect(Collectors.toSet());
        }
        event.setDepartments(departments);

        // Set employees
        Set<User> employees = new HashSet<>();
        if (request.getEmployeeIds() != null && !request.getEmployeeIds().isEmpty()) {
            employees = request.getEmployeeIds().stream()
                    .map(empId -> userRepository.findById(empId)
                            .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + empId)))
                    .collect(Collectors.toSet());
        }
        event.setEmployees(employees);
    }

    private void validateEventDates(EventRequest request) {
        LocalDateTime startDateTime = LocalDateTime.of(request.getStartsOnDate(), request.getStartsOnTime());
        LocalDateTime endDateTime = LocalDateTime.of(request.getEndsOnDate(), request.getEndsOnTime());

        if (endDateTime.isBefore(startDateTime) || endDateTime.isEqual(startDateTime)) {
            throw new BadRequestException("End date/time must be after start date/time");
        }
    }

    private EventDto convertToDto(Event event) {
        EventDto dto = new EventDto();
        dto.setId(event.getId());
        dto.setEventName(event.getEventName());
        dto.setWhere(event.getWhere());
        dto.setDescription(event.getDescription());
        dto.setStartsOnDate(event.getStartsOnDate());
        dto.setStartsOnTime(event.getStartsOnTime());
        dto.setEndsOnDate(event.getEndsOnDate());
        dto.setEndsOnTime(event.getEndsOnTime());
        dto.setStatus(event.getStatus());
        dto.setEventLink(event.getEventLink());
        dto.setCreatedAt(event.getCreatedAt());
        dto.setUpdatedAt(event.getUpdatedAt());

        // Set created by name
        if (event.getCreatedBy() != null) {
            dto.setCreatedByName(event.getCreatedBy().getFullName());
        }

        // Convert departments
        List<DepartmentResponse> departmentResponses = event.getDepartments().stream()
                .map(this::convertDepartmentToResponse)
                .collect(Collectors.toList());
        dto.setDepartments(departmentResponses);

        // Convert employees
        List<EmployeeResponse> employeeResponses = event.getEmployees().stream()
                .map(this::convertUserToEmployeeResponse)
                .collect(Collectors.toList());
        dto.setEmployees(employeeResponses);

        return dto;
    }

    private DepartmentResponse convertDepartmentToResponse(Department department) {
        DepartmentResponse response = new DepartmentResponse();
        response.setId(department.getId());
        response.setName(department.getName());
        response.setDescription(department.getDescription());
        response.setParentDepartmentId(department.getParentDepartment() != null ? department.getParentDepartment().getId() : null);
        response.setParentDepartmentName(department.getParentDepartment() != null ? department.getParentDepartment().getName() : null);
        response.setCreatedAt(department.getCreatedAt());
        response.setUpdatedAt(department.getUpdatedAt());
        return response;
    }

    private EmployeeResponse convertUserToEmployeeResponse(User user) {
        EmployeeResponse response = new EmployeeResponse();
        response.setId(user.getId());
        response.setEmail(user.getEmail());
        response.setFirstName(user.getFirstName());
        response.setLastName(user.getLastName());
        response.setFullName(user.getFullName());
        response.setEmployeeId(user.getEmployeeId());
        response.setRoleName(user.getRole() != null ? user.getRole().getName() : null);
        response.setDesignationName(user.getDesignation() != null ? user.getDesignation().getName() : null);
        response.setReportingManagerName(user.getReportingManager() != null ? user.getReportingManager().getFullName() : null);
        response.setStatus(user.getStatus() != null ? user.getStatus().toString() : null);
        response.setCreatedAt(user.getCreatedAt());
        response.setDepartment(user.getDepartment());
        return response;
    }
}
