package com.dashboard.app.service;

import com.dashboard.app.dto.request.ShiftRequest;
import com.dashboard.app.dto.response.ShiftResponse;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ForbiddenException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.Shift;
import com.dashboard.app.repository.ShiftAssignmentRepository;
import com.dashboard.app.repository.ShiftRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ShiftService {

    @Autowired
    private ShiftRepository shiftRepository;

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private ShiftAssignmentRepository shiftAssignmentRepository;

    public ShiftResponse createShift(ShiftRequest request, Long userId) {
        if (userId == null) {
            throw new BadRequestException("Unauthorized");
        }
        
        // Check if user has "add" permission for Shift Roster module
        String addPermission = permissionService.getModulePermission(userId, "Shift Roster", "add");
        if ("None".equals(addPermission)) {
            throw new ForbiddenException("You do not have permission to create shifts");
        }
        // For shifts, "All" permission is required since shifts are not user-specific
        if (!"All".equals(addPermission)) {
            throw new ForbiddenException("You do not have permission to create shifts");
        }
        
        validateShiftTimings(request);

        Shift shift = new Shift();
        shift.setName(request.getName().trim());
        shift.setStartTime(LocalTime.parse(request.getStartTime()));
        shift.setEndTime(LocalTime.parse(request.getEndTime()));
        shift.setGraceMinutes(request.getGraceMinutes());

        Shift saved = shiftRepository.save(shift);
        return mapToResponse(saved);
    }

    public List<ShiftResponse> getShifts() {
        return shiftRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public void deleteShift(Long shiftId, Long userId) {
        if (userId == null) {
            throw new BadRequestException("Unauthorized");
        }
        
        // Check if user has "delete" permission for Shift Roster module
        String deletePermission = permissionService.getModulePermission(userId, "Shift Roster", "delete");
        if ("None".equals(deletePermission)) {
            throw new ForbiddenException("You do not have permission to delete shifts");
        }
        // For shifts, "All" permission is required since shifts are not user-specific
        if (!"All".equals(deletePermission)) {
            throw new ForbiddenException("You do not have permission to delete shifts");
        }
        
        Shift shift = shiftRepository.findById(shiftId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found"));

        if (shiftAssignmentRepository.existsByShiftId(shiftId)) {
            throw new BadRequestException("Cannot delete a shift that is already assigned to employees");
        }

        shiftRepository.delete(shift);
    }

    public Shift findShiftById(Long id) {
        return shiftRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shift not found"));
    }

    public Shift getDefaultShift() {
        return shiftRepository.findFirstByNameIgnoreCase("General Shift")
                .or(() -> shiftRepository.findTopByOrderByIdAsc())
                .orElse(null);
    }

    private void validateShiftTimings(ShiftRequest request) {
        if (request.getGraceMinutes() % 5 != 0) {
            throw new BadRequestException("Grace minutes must be in 5 minute increments");
        }
    }

    private ShiftResponse mapToResponse(Shift shift) {
        ShiftResponse response = new ShiftResponse();
        response.setId(shift.getId());
        response.setName(shift.getName());
        response.setStartTime(shift.getStartTime().toString());
        response.setEndTime(shift.getEndTime().toString());
        response.setGraceMinutes(shift.getGraceMinutes());
        response.setLabel(String.format("%s [%s - %s]",
                shift.getName(),
                shift.getStartTime(),
                shift.getEndTime()));
        return response;
    }
}


