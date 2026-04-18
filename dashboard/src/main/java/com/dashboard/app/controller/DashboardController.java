package com.dashboard.app.controller;

import com.dashboard.app.dto.response.DashboardStatsResponse;
import com.dashboard.app.dto.response.GoogleMapsApiKeyResponse;
import com.dashboard.app.model.enums.AttendanceStatus;
import com.dashboard.app.repository.AttendanceRepository;
import com.dashboard.app.repository.ProjectRepository;
import com.dashboard.app.repository.TaskRepository;
import com.dashboard.app.repository.UserRepository;
import com.dashboard.app.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Value("${google.maps.api-key}")
    private String googleMapsApiKey;

    private Long getCurrentUserId(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            return jwtUtil.extractUserId(token);
        }
        return null;
    }

    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsResponse> getDashboardStats(HttpServletRequest request) {
        Long totalClients = userRepository.count();
        Long totalEmployees = userRepository.count();
        Long totalProjects = projectRepository.count();
        Long pendingTasks = taskRepository.count();
        
        // Use UTC timezone to match database timezone
        LocalDate today = ZonedDateTime.now(ZoneId.of("UTC")).toLocalDate();
        Long todayAttendance = (long) attendanceRepository.findByAttendanceDate(today)
                .stream()
                .filter(a -> a.getStatus() == AttendanceStatus.PRESENT)
                .count();
        String attendanceStr = todayAttendance + "/" + totalEmployees;

        DashboardStatsResponse response = new DashboardStatsResponse();
        response.setTotalClients(totalClients);
        response.setTotalEmployees(totalEmployees);
        response.setTotalProjects(totalProjects);
        response.setDueInvoices(0L);
        response.setHoursLogged("0 hrs 0 mins");
        response.setPendingTasks(pendingTasks);
        response.setTodayAttendance(attendanceStr);
        response.setUnresolvedTickets(0L);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/google-maps-api-key")
    public ResponseEntity<GoogleMapsApiKeyResponse> getGoogleMapsApiKey() {
        GoogleMapsApiKeyResponse response = new GoogleMapsApiKeyResponse();
        response.setApiKey(googleMapsApiKey);
        return ResponseEntity.ok(response);
    }
}

