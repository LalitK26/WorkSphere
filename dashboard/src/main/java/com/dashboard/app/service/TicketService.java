package com.dashboard.app.service;

import com.dashboard.app.dto.request.TicketReplyRequest;
import com.dashboard.app.dto.request.TicketRequest;
import com.dashboard.app.dto.request.TicketUpdateRequest;
import com.dashboard.app.dto.response.*;
import com.dashboard.app.exception.BadRequestException;
import com.dashboard.app.exception.ForbiddenException;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.*;
import com.dashboard.app.model.enums.RoleType;
import com.dashboard.app.model.enums.TicketPriority;
import com.dashboard.app.model.enums.TicketStatus;
import com.dashboard.app.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class TicketService {

    private static final Logger logger = LoggerFactory.getLogger(TicketService.class);

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private TicketActivityRepository ticketActivityRepository;

    @Autowired
    private TicketReplyRepository ticketReplyRepository;

    @Autowired
    private TicketFileRepository ticketFileRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private DashboardEmailService dashboardEmailService;

    @Autowired
    private PermissionService permissionService;

    @Autowired
    private FileStorageService fileStorageService;

    public TicketResponse createTicket(TicketRequest request, Long createdById) {
        if (createdById == null) {
            throw new BadRequestException("User not authenticated");
        }

        // Check if user has add permission
        String addPermission = permissionService.getModulePermission(createdById, "Tickets", "add");
        if ("None".equals(addPermission)) {
            throw new ForbiddenException("You do not have permission to create tickets");
        }

        // Validate requesterId is not null
        if (request.getRequesterId() == null) {
            throw new BadRequestException("Requester ID is required");
        }

        User requester = userRepository.findById(request.getRequesterId())
                .orElseThrow(() -> new ResourceNotFoundException("Requester not found"));

        User createdBy = userRepository.findById(createdById)
                .orElseThrow(() -> new ResourceNotFoundException("Creator not found"));

        // If permission is "All", user can create tickets for any employee
        // If permission is "Added" or "Owned", user can only create tickets for themselves
        if (!"All".equals(addPermission) && !createdById.equals(request.getRequesterId())) {
            throw new ForbiddenException("You can only create tickets for yourself");
        }

        Ticket ticket = new Ticket();
        ticket.setSubject(request.getSubject());
        ticket.setDescription(request.getDescription());
        ticket.setTicketNumber(generateTicketNumber());
        ticket.setRequester(requester);
        ticket.setRequesterEmail(request.getRequesterEmail() != null ? request.getRequesterEmail() : requester.getEmail());
        ticket.setRequesterType(request.getRequesterType() != null ? request.getRequesterType() : "EMPLOYEE");

        if (request.getStatus() != null) {
            ticket.setStatus(TicketStatus.valueOf(request.getStatus().toUpperCase()));
        } else {
            ticket.setStatus(TicketStatus.OPEN);
        }

        if (request.getPriority() != null) {
            ticket.setPriority(TicketPriority.valueOf(request.getPriority().toUpperCase()));
        } else {
            ticket.setPriority(TicketPriority.LOW);
        }

        // Handle ticket assignment
        if (request.getAssignedAgentId() != null) {
            // Only users with "All" permission can assign tickets to specific agents
            if ("All".equals(addPermission)) {
                User agent = userRepository.findById(request.getAssignedAgentId())
                        .orElseThrow(() -> new ResourceNotFoundException("Assigned agent not found"));
                ticket.setAssignedAgent(agent);
            }
        } else {
            // If no agent specified and user doesn't have "All" permission, auto-assign to admin
            if (!"All".equals(addPermission)) {
                // Find an admin user to assign the ticket to
                User adminUser = userRepository.findAll().stream()
                        .filter(u -> u.getRole() != null && 
                                u.getRole().getType() != null && 
                                u.getRole().getType() == RoleType.ADMIN)
                        .findFirst()
                        .orElse(null);
                
                if (adminUser != null) {
                    ticket.setAssignedAgent(adminUser);
                }
            }
        }

        // Only users with "All" permission can set assignGroup
        if ("All".equals(addPermission)) {
            ticket.setAssignGroup(request.getAssignGroup());
        } else {
            ticket.setAssignGroup(null);
        }
        
        ticket.setTicketType(request.getTicketType());
        ticket.setChannelName(request.getChannelName());
        ticket.setTags(request.getTags());

        if (request.getProjectId() != null) {
            Project project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
            ticket.setProject(project);
        }

        Ticket saved = ticketRepository.save(ticket);

        // Create initial activity
        TicketActivity activity = new TicketActivity();
        activity.setTicket(saved);
        activity.setUser(createdBy);
        activity.setAction("Ticket created");
        ticketActivityRepository.save(activity);

        // Handle file uploads
        if (request.getFiles() != null && !request.getFiles().isEmpty()) {
            for (TicketRequest.FileData fileData : request.getFiles()) {
                // Validate file data before processing
                if (fileData == null) {
                    continue; // Skip null file data
                }
                
                if (fileData.getFileContent() == null || fileData.getFileContent().isEmpty()) {
                    throw new BadRequestException("File content is required for file: " + 
                        (fileData.getFileName() != null ? fileData.getFileName() : "unknown"));
                }
                
                if (fileData.getFileName() == null || fileData.getFileName().isEmpty()) {
                    throw new BadRequestException("File name is required");
                }
                
                // Upload file to local storage
                String filePath = fileStorageService.uploadFileFromBase64(
                        fileData.getFileContent(),
                        fileData.getFileName(),
                        fileData.getContentType() != null ? fileData.getContentType() : "application/octet-stream",
                        fileData.getFileSize() != null ? fileData.getFileSize() : 0
                );
                
                // Validate filePath is not null and not empty
                if (filePath == null || filePath.isEmpty()) {
                    throw new BadRequestException("Failed to generate file path for: " + fileData.getFileName());
                }
                
                // Validate filePath length (database column is VARCHAR(1000))
                if (filePath.length() > 1000) {
                    throw new BadRequestException("File path is too long. Please use a shorter file name.");
                }
                
                try {
                    TicketFile file = new TicketFile();
                    file.setTicket(saved);
                    file.setFileName(fileData.getFileName());
                    file.setFileContent(""); // Legacy field - set to empty string since we use filePath
                    file.setFilePath(filePath); // Store relative file path
                    file.setFileSize(fileData.getFileSize());
                    file.setContentType(fileData.getContentType() != null ? fileData.getContentType() : "application/octet-stream");
                    
                    TicketFile savedFile = ticketFileRepository.save(file);
                    logger.info("Successfully saved ticket file: id={}, fileName={}, filePath={}, ticketId={}", 
                        savedFile.getId(), savedFile.getFileName(), savedFile.getFilePath(), saved.getId());
                } catch (Exception e) {
                    logger.error("Failed to save ticket file: fileName={}, filePath={}, ticketId={}", 
                        fileData.getFileName(), filePath, saved.getId(), e);
                    throw new RuntimeException("Failed to save ticket file: " + e.getMessage(), e);
                }
            }
        }

        // Send HTML email notification to admin when ticket is created
        try {
            // Find admin email to notify
            User adminUser = userRepository.findAll().stream()
                    .filter(u -> u.getRole() != null && 
                            u.getRole().getType() != null && 
                            u.getRole().getType() == RoleType.ADMIN)
                    .findFirst()
                    .orElse(null);
            
            String adminEmail = adminUser != null ? adminUser.getEmail() : null;
            
            if (adminEmail == null || adminEmail.isBlank()) {
                logger.warn("No admin user found with valid email. Ticket created notification will not be sent for ticket: {}", 
                    saved.getTicketNumber());
            } else {
                logger.info("Sending ticket created notification to admin: {} for ticket: {}", adminEmail, saved.getTicketNumber());
                dashboardEmailService.sendTicketCreatedNotificationHtml(
                    adminEmail,
                    saved.getTicketNumber(),
                    saved.getSubject(),
                    requester.getFullName(),
                    saved.getRequesterEmail(),
                    saved.getPriority() != null ? saved.getPriority().name() : "LOW",
                    saved.getId()
                );
            }
        } catch (Exception e) {
            logger.error("Failed to send ticket created email notification for ticket {}: {}", 
                saved.getTicketNumber(), e.getMessage(), e);
            // Don't fail ticket creation if email fails
        }

        return mapToResponse(saved);
    }

    public TicketResponse updateTicket(Long id, TicketUpdateRequest request, Long userId) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check if user has update permission
        String updatePermission = permissionService.getModulePermission(userId, "Tickets", "update");
        if ("None".equals(updatePermission)) {
            throw new ForbiddenException("You do not have permission to update tickets");
        }

        // If permission is not "All", check ownership
        // For tickets: requester = createdBy (person who created the ticket)
        //              assignedAgent = assignedTo (person assigned to handle the ticket)
        if (!"All".equals(updatePermission)) {
            Long requesterId = ticket.getRequester() != null ? ticket.getRequester().getId() : null;
            Long assignedAgentId = ticket.getAssignedAgent() != null ? ticket.getAssignedAgent().getId() : null;
            
            boolean canAccess;
            // For "Owned" permission, check if current user is the requester
            // When admin creates a ticket for an employee, the requester is the employee
            // So only the requester (the employee) should be able to update the ticket
            if ("Owned".equals(updatePermission)) {
                canAccess = requesterId != null && requesterId.equals(userId);
            } else {
                // For other permissions (Added, Added & Owned), use standard canAccessItem logic
                canAccess = permissionService.canAccessItem(
                        userId, "Tickets", "update",
                        requesterId, assignedAgentId, null
                );
            }
            
            if (!canAccess) {
                throw new ForbiddenException("You do not have permission to update this ticket");
            }
        }

        // Determine user roles for status change logic
        boolean isAdmin = user.getRole().getType().equals(RoleType.ADMIN);
        boolean hasAllPermission = "All".equals(updatePermission);
        boolean isAssignedAgent = ticket.getAssignedAgent() != null && ticket.getAssignedAgent().getId().equals(userId);

        if (request.getSubject() != null) {
            ticket.setSubject(request.getSubject());
        }
        if (request.getDescription() != null) {
            ticket.setDescription(request.getDescription());
        }
        if (request.getPriority() != null) {
            ticket.setPriority(TicketPriority.valueOf(request.getPriority().toUpperCase()));
        }
        if (request.getAssignGroup() != null) {
            String assignGroup = request.getAssignGroup().trim();
            ticket.setAssignGroup(assignGroup.isEmpty() ? null : assignGroup);
        }
        if (request.getAssignedAgentId() != null) {
            User agent = userRepository.findById(request.getAssignedAgentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assigned agent not found"));
            User previousAgent = ticket.getAssignedAgent();
            ticket.setAssignedAgent(agent);
            
            // Send HTML email notification to assigned employee if assignment changed
            if (previousAgent == null || !previousAgent.getId().equals(agent.getId())) {
                try {
                    if (agent.getEmail() != null && !agent.getEmail().isBlank()) {
                        logger.info("Sending ticket assigned notification to: {} for ticket: {}", 
                            agent.getEmail(), ticket.getTicketNumber());
                        dashboardEmailService.sendTicketAssignedNotificationHtml(
                            agent.getEmail(),
                            agent.getFullName(),
                            ticket.getTicketNumber(),
                            ticket.getSubject(),
                            ticket.getPriority() != null ? ticket.getPriority().name() : "LOW",
                            ticket.getRequester() != null ? ticket.getRequester().getFullName() : "Unknown",
                            ticket.getId()
                        );
                    } else {
                        logger.warn("Assigned agent has no email. Ticket assigned notification skipped for ticket: {}", 
                            ticket.getTicketNumber());
                    }
                } catch (Exception e) {
                    logger.error("Failed to send ticket assigned email notification for ticket {}: {}", 
                        ticket.getTicketNumber(), e.getMessage(), e);
                }
                
                // Create activity for assignment
                TicketActivity activity = new TicketActivity();
                activity.setTicket(ticket);
                activity.setUser(user);
                activity.setAction("Ticket assigned to " + agent.getFullName());
                ticketActivityRepository.save(activity);
            }
        }
        if (request.getProjectId() != null) {
            Project project = projectRepository.findById(request.getProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
            ticket.setProject(project);
        }
        if (request.getTicketType() != null) {
            String ticketType = request.getTicketType().trim();
            ticket.setTicketType(ticketType.isEmpty() ? null : ticketType);
        }
        if (request.getChannelName() != null) {
            String channelName = request.getChannelName().trim();
            ticket.setChannelName(channelName.isEmpty() ? null : channelName);
        }
        if (request.getTags() != null) {
            String tags = request.getTags().trim();
            ticket.setTags(tags.isEmpty() ? null : tags);
        }

        // Admin, users with "All" permission, or assigned agent can change status
        if (request.getStatus() != null && (isAdmin || hasAllPermission || isAssignedAgent)) {
            TicketStatus oldStatus = ticket.getStatus();
            TicketStatus newStatus = TicketStatus.valueOf(request.getStatus().toUpperCase());
            if (!oldStatus.equals(newStatus)) {
                ticket.setStatus(newStatus);
                // Create activity for status change
                TicketActivity activity = new TicketActivity();
                activity.setTicket(ticket);
                activity.setUser(user);
                activity.setAction("Status changed to " + newStatus.name());
                ticketActivityRepository.save(activity);
                
                // Send status update notification to ticket requester
                try {
                    if (ticket.getRequester() != null && ticket.getRequester().getEmail() != null 
                            && !ticket.getRequester().getEmail().isBlank()) {
                        logger.info("Sending ticket status update notification to: {} for ticket: {} (status: {} -> {})", 
                            ticket.getRequester().getEmail(), ticket.getTicketNumber(), oldStatus.name(), newStatus.name());
                        dashboardEmailService.sendTicketStatusUpdateNotification(
                            ticket.getRequester().getEmail(),
                            ticket.getRequester().getFullName(),
                            ticket.getTicketNumber(),
                            ticket.getSubject(),
                            oldStatus.name(),
                            newStatus.name(),
                            user.getFullName(),
                            ticket.getId()
                        );
                    } else {
                        logger.warn("Ticket requester has no email. Status update notification skipped for ticket: {}", 
                            ticket.getTicketNumber());
                    }
                } catch (Exception e) {
                    logger.error("Failed to send ticket status update email for ticket {}: {}", 
                        ticket.getTicketNumber(), e.getMessage(), e);
                }
            }
        }

        Ticket updated = ticketRepository.save(ticket);
        return mapToResponse(updated);
    }

    public TicketResponse getTicketById(Long id, Long userId) {
        if (userId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        // Check if user has view permission
        String viewPermission = permissionService.getModulePermission(userId, "Tickets", "view");
        if ("None".equals(viewPermission)) {
            throw new ForbiddenException("You do not have permission to view tickets");
        }

        // If "All" permission, allow access
        if ("All".equals(viewPermission)) {
            return mapToResponse(ticket);
        }

        // For other permissions, check ownership
        Long requesterId = ticket.getRequester() != null ? ticket.getRequester().getId() : null;
        Long assignedAgentId = ticket.getAssignedAgent() != null ? ticket.getAssignedAgent().getId() : null;
        
        // For "Owned" permission, check if current user is the requester
        // When admin creates a ticket for an employee, the requester is the employee
        // So only the requester (the employee) should see the ticket
        if ("Owned".equals(viewPermission)) {
            if (requesterId == null || !requesterId.equals(userId)) {
                throw new ForbiddenException("You do not have permission to view this ticket");
            }
            return mapToResponse(ticket);
        }
        
        // For other permissions (Added, Added & Owned), use standard canAccessItem logic
        boolean canAccess = permissionService.canAccessItem(
                userId, "Tickets", "view",
                requesterId, assignedAgentId, null
        );
        
        if (!canAccess) {
            throw new ForbiddenException("You do not have permission to view this ticket");
        }

        return mapToResponse(ticket);
    }

    public List<TicketResponse> getAllTickets(Long userId) {
        if (userId == null) {
            return new java.util.ArrayList<>();
        }

        String viewPermission = permissionService.getModulePermission(userId, "Tickets", "view");
        
        // If no permission, return empty list
        if ("None".equals(viewPermission)) {
            return new java.util.ArrayList<>();
        }
        
        // If "All" permission, return all tickets
        if ("All".equals(viewPermission)) {
            return ticketRepository.findAll().stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }
        
        // Filter based on permission level
        List<Ticket> allTickets = ticketRepository.findAll();
        
        return allTickets.stream()
                .filter(ticket -> {
                    Long requesterId = ticket.getRequester() != null ? ticket.getRequester().getId() : null;
                    Long assignedAgentId = ticket.getAssignedAgent() != null ? ticket.getAssignedAgent().getId() : null;
                    
                    // For "Owned" permission, check if current user is the requester
                    // When admin creates a ticket for an employee, the requester is the employee
                    // So only the requester (the employee) should see the ticket
                    if ("Owned".equals(viewPermission)) {
                        return requesterId != null && requesterId.equals(userId);
                    }
                    
                    // For other permissions (Added, Added & Owned), use standard canAccessItem logic
                    // For tickets: requester = createdBy, assignedAgent = assignedTo
                    return permissionService.canAccessItem(
                            userId, "Tickets", "view",
                            requesterId, assignedAgentId, null
                    );
                })
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<TicketResponse> getTicketsByStatus(String status, Long userId) {
        if (userId == null) {
            return new java.util.ArrayList<>();
        }

        TicketStatus ticketStatus = TicketStatus.valueOf(status.toUpperCase());

        String viewPermission = permissionService.getModulePermission(userId, "Tickets", "view");
        
        // If no permission, return empty list
        if ("None".equals(viewPermission)) {
            return new java.util.ArrayList<>();
        }
        
        // If "All" permission, return all tickets with the specified status
        if ("All".equals(viewPermission)) {
            return ticketRepository.findByStatus(ticketStatus).stream()
                    .map(this::mapToResponse)
                    .collect(Collectors.toList());
        }
        
        // For other permissions, filter based on ownership
        List<Ticket> allTickets = ticketRepository.findByStatus(ticketStatus);
        
        return allTickets.stream()
                .filter(ticket -> {
                    Long requesterId = ticket.getRequester() != null ? ticket.getRequester().getId() : null;
                    Long assignedAgentId = ticket.getAssignedAgent() != null ? ticket.getAssignedAgent().getId() : null;
                    
                    // For "Owned" permission, check if current user is the requester
                    // When admin creates a ticket for an employee, the requester is the employee
                    // So only the requester (the employee) should see the ticket
                    if ("Owned".equals(viewPermission)) {
                        return requesterId != null && requesterId.equals(userId);
                    }
                    
                    // For other permissions (Added, Added & Owned), use standard canAccessItem logic
                    return permissionService.canAccessItem(
                            userId, "Tickets", "view",
                            requesterId, assignedAgentId, null
                    );
                })
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public TicketSummaryResponse getTicketSummary(Long userId) {
        if (userId == null) {
            TicketSummaryResponse emptySummary = new TicketSummaryResponse();
            emptySummary.setTotalTickets(0L);
            emptySummary.setOpenTickets(0L);
            emptySummary.setPendingTickets(0L);
            emptySummary.setResolvedTickets(0L);
            emptySummary.setClosedTickets(0L);
            return emptySummary;
        }

        String viewPermission = permissionService.getModulePermission(userId, "Tickets", "view");
        
        TicketSummaryResponse summary = new TicketSummaryResponse();

        // If "All" permission, return summary for all tickets
        if ("All".equals(viewPermission)) {
            summary.setTotalTickets(ticketRepository.count());
            summary.setOpenTickets(ticketRepository.countByStatus(TicketStatus.OPEN));
            summary.setPendingTickets(ticketRepository.countByStatus(TicketStatus.PENDING));
            summary.setResolvedTickets(ticketRepository.countByStatus(TicketStatus.RESOLVED));
            summary.setClosedTickets(ticketRepository.countByStatus(TicketStatus.CLOSED));
        } else {
            // For other permissions, count tickets the user can access
            // Get all tickets and filter based on permission
            List<Ticket> allTickets = ticketRepository.findAll();
            long totalCount = 0;
            long openCount = 0;
            long pendingCount = 0;
            long resolvedCount = 0;
            long closedCount = 0;
            
            for (Ticket ticket : allTickets) {
                Long requesterId = ticket.getRequester() != null ? ticket.getRequester().getId() : null;
                Long assignedAgentId = ticket.getAssignedAgent() != null ? ticket.getAssignedAgent().getId() : null;
                
                boolean canAccess;
                // For "Owned" permission, check if current user is the requester
                // When admin creates a ticket for an employee, the requester is the employee
                // So only the requester (the employee) should see the ticket
                if ("Owned".equals(viewPermission)) {
                    canAccess = requesterId != null && requesterId.equals(userId);
                } else {
                    // For other permissions (Added, Added & Owned), use standard canAccessItem logic
                    canAccess = permissionService.canAccessItem(userId, "Tickets", "view", requesterId, assignedAgentId, null);
                }
                
                if (canAccess) {
                    totalCount++;
                    switch (ticket.getStatus()) {
                        case OPEN:
                            openCount++;
                            break;
                        case PENDING:
                            pendingCount++;
                            break;
                        case RESOLVED:
                            resolvedCount++;
                            break;
                        case CLOSED:
                            closedCount++;
                            break;
                    }
                }
            }
            
            summary.setTotalTickets(totalCount);
            summary.setOpenTickets(openCount);
            summary.setPendingTickets(pendingCount);
            summary.setResolvedTickets(resolvedCount);
            summary.setClosedTickets(closedCount);
        }

        return summary;
    }

    public TicketReplyResponse addReply(TicketReplyRequest request, Long userId, Long ticketId) {
        if (userId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Long ticketIdToUse = request.getTicketId() != null ? request.getTicketId() : ticketId;
        Ticket ticket = ticketRepository.findById(ticketIdToUse)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check if user has view permission (required to reply)
        String viewPermission = permissionService.getModulePermission(userId, "Tickets", "view");
        if ("None".equals(viewPermission)) {
            throw new ForbiddenException("You do not have permission to reply to tickets");
        }

        // If "All" permission, user can reply to any ticket
        if ("All".equals(viewPermission)) {
            // Allow reply
        } else {
            // For other permissions, check if user can access this ticket
            Long requesterId = ticket.getRequester() != null ? ticket.getRequester().getId() : null;
            Long assignedAgentId = ticket.getAssignedAgent() != null ? ticket.getAssignedAgent().getId() : null;
            
            boolean canAccess = permissionService.canAccessItem(
                    userId, "Tickets", "view",
                    requesterId, assignedAgentId, null
            );
            if (!canAccess) {
                throw new ForbiddenException("You don't have permission to reply to this ticket");
            }
        }

        TicketReply reply = new TicketReply();
        reply.setTicket(ticket);
        reply.setUser(user);
        reply.setMessage(request.getMessage());

        TicketReply saved = ticketReplyRepository.save(reply);

        // Handle file uploads
        if (request.getFiles() != null && !request.getFiles().isEmpty()) {
            for (TicketReplyRequest.FileData fileData : request.getFiles()) {
                // Validate file data before processing
                if (fileData == null) {
                    continue; // Skip null file data
                }
                
                if (fileData.getFileContent() == null || fileData.getFileContent().isEmpty()) {
                    throw new BadRequestException("File content is required for file: " + 
                        (fileData.getFileName() != null ? fileData.getFileName() : "unknown"));
                }
                
                if (fileData.getFileName() == null || fileData.getFileName().isEmpty()) {
                    throw new BadRequestException("File name is required");
                }
                
                // Upload file to local storage
                String filePath = fileStorageService.uploadFileFromBase64(
                        fileData.getFileContent(),
                        fileData.getFileName(),
                        fileData.getContentType() != null ? fileData.getContentType() : "application/octet-stream",
                        fileData.getFileSize() != null ? fileData.getFileSize() : 0
                );
                
                // Validate filePath is not null and not empty
                if (filePath == null || filePath.isEmpty()) {
                    throw new BadRequestException("Failed to generate file path for: " + fileData.getFileName());
                }
                
                // Validate filePath length (database column is VARCHAR(1000))
                if (filePath.length() > 1000) {
                    throw new BadRequestException("File path is too long. Please use a shorter file name.");
                }
                
                try {
                    TicketFile file = new TicketFile();
                    file.setTicket(ticket);
                    file.setReply(saved);
                    file.setFileName(fileData.getFileName());
                    file.setFileContent(""); // Legacy field - set to empty string since we use filePath
                    file.setFilePath(filePath); // Store relative file path
                    file.setFileSize(fileData.getFileSize());
                    file.setContentType(fileData.getContentType() != null ? fileData.getContentType() : "application/octet-stream");
                    
                    TicketFile savedFile = ticketFileRepository.save(file);
                    logger.info("Successfully saved ticket reply file: id={}, fileName={}, filePath={}, ticketId={}, replyId={}", 
                        savedFile.getId(), savedFile.getFileName(), savedFile.getFilePath(), ticket.getId(), saved.getId());
                } catch (Exception e) {
                    logger.error("Failed to save ticket reply file: fileName={}, filePath={}, ticketId={}, replyId={}", 
                        fileData.getFileName(), filePath, ticket.getId(), saved.getId(), e);
                    throw new RuntimeException("Failed to save ticket reply file: " + e.getMessage(), e);
                }
            }
        }

        return mapReplyToResponse(saved);
    }

    public void deleteTicket(Long id, Long userId) {
        if (userId == null) {
            throw new BadRequestException("User not authenticated");
        }

        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        // Check if user has delete permission
        String deletePermission = permissionService.getModulePermission(userId, "Tickets", "delete");
        if ("None".equals(deletePermission)) {
            throw new ForbiddenException("You do not have permission to delete tickets");
        }

        // If "All" permission, user can delete any ticket
        if ("All".equals(deletePermission)) {
            ticketRepository.deleteById(id);
            return;
        }

        // For other permissions, check ownership
        Long requesterId = ticket.getRequester() != null ? ticket.getRequester().getId() : null;
        Long assignedAgentId = ticket.getAssignedAgent() != null ? ticket.getAssignedAgent().getId() : null;
        
        boolean canAccess = permissionService.canAccessItem(
                userId, "Tickets", "delete",
                requesterId, assignedAgentId, null
        );
        if (!canAccess) {
            throw new ForbiddenException("You don't have permission to delete this ticket");
        }

        ticketRepository.deleteById(id);
    }

    private synchronized String generateTicketNumber() {
        int maxRetries = 10;
        int retryCount = 0;
        
        while (retryCount < maxRetries) {
            // Find the highest existing ticket number
            Optional<String> maxTicketNumberOpt = ticketRepository.findMaxTicketNumber();
            
            long nextNumber = 1;
            if (maxTicketNumberOpt.isPresent()) {
                String maxTicketNumber = maxTicketNumberOpt.get();
                // Extract number from format "TKT-XXX"
                try {
                    String numberPart = maxTicketNumber.substring(4); // Skip "TKT-"
                    nextNumber = Long.parseLong(numberPart) + 1;
                } catch (Exception e) {
                    // If parsing fails, start from 1
                    nextNumber = 1;
                }
            }
            
            String newTicketNumber = String.format("TKT-%03d", nextNumber);
            
            // Check if this ticket number already exists (handles race conditions)
            if (!ticketRepository.findByTicketNumber(newTicketNumber).isPresent()) {
                return newTicketNumber;
            }
            
            // If it exists, increment and try again
            nextNumber++;
            retryCount++;
        }
        
        // Fallback: use timestamp-based number if all retries fail
        return String.format("TKT-%03d", System.currentTimeMillis() % 1000);
    }

    private TicketResponse mapToResponse(Ticket ticket) {
        TicketResponse response = new TicketResponse();
        response.setId(ticket.getId());
        response.setTicketNumber(ticket.getTicketNumber());
        response.setSubject(ticket.getSubject());
        response.setDescription(ticket.getDescription());
        response.setStatus(ticket.getStatus().name());
        response.setPriority(ticket.getPriority().name());
        response.setRequesterId(ticket.getRequester().getId());
        response.setRequesterName(ticket.getRequester().getFullName());
        response.setRequesterEmail(ticket.getRequesterEmail());
        response.setRequesterDesignation(ticket.getRequester().getDesignation() != null ? ticket.getRequester().getDesignation().getName() : null);
        response.setRequesterProfilePicture(com.dashboard.app.util.FileUrlUtil.convertFilePathToUrl(ticket.getRequester().getProfilePictureUrl()));
        response.setRequesterType(ticket.getRequesterType());

        if (ticket.getAssignedAgent() != null) {
            response.setAssignedAgentId(ticket.getAssignedAgent().getId());
            response.setAssignedAgentName(ticket.getAssignedAgent().getFullName());
        }

        response.setAssignGroup(ticket.getAssignGroup());
        response.setTicketType(ticket.getTicketType());
        response.setChannelName(ticket.getChannelName());
        response.setTags(ticket.getTags());

        if (ticket.getProject() != null) {
            response.setProjectId(ticket.getProject().getId());
            response.setProjectName(ticket.getProject().getName());
        }

        response.setCreatedAt(ticket.getCreatedAt());
        response.setUpdatedAt(ticket.getUpdatedAt());

        // Load activities
        List<TicketActivity> activities = ticketActivityRepository.findByTicketIdOrderByCreatedAtDesc(ticket.getId());
        response.setActivities(activities.stream()
                .map(this::mapActivityToResponse)
                .collect(Collectors.toList()));

        // Load replies
        List<TicketReply> replies = ticketReplyRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId());
        response.setReplies(replies.stream()
                .map(this::mapReplyToResponse)
                .collect(Collectors.toList()));

        // Load files - only files attached directly to ticket (not to replies)
        List<TicketFile> allFiles = ticketFileRepository.findByTicketId(ticket.getId());
        List<TicketFile> ticketFiles = allFiles.stream()
                .filter(file -> file.getReply() == null)
                .collect(Collectors.toList());
        response.setFiles(ticketFiles.stream()
                .map(this::mapFileToResponse)
                .collect(Collectors.toList()));

        return response;
    }

    private TicketActivityResponse mapActivityToResponse(TicketActivity activity) {
        TicketActivityResponse response = new TicketActivityResponse();
        response.setId(activity.getId());
        response.setAction(activity.getAction());
        response.setUserId(activity.getUser().getId());
        response.setUserName(activity.getUser().getFullName());
        response.setCreatedAt(activity.getCreatedAt());
        return response;
    }

    private TicketReplyResponse mapReplyToResponse(TicketReply reply) {
        if (reply == null) {
            throw new BadRequestException("Reply cannot be null");
        }
        
        TicketReplyResponse response = new TicketReplyResponse();
        response.setId(reply.getId());
        response.setMessage(reply.getMessage());
        
        // Safely handle user data
        if (reply.getUser() == null) {
            throw new BadRequestException("Reply user cannot be null");
        }
        
        response.setUserId(reply.getUser().getId());
        response.setUserName(reply.getUser().getFullName() != null ? reply.getUser().getFullName() : "");
        response.setUserProfilePicture(com.dashboard.app.util.FileUrlUtil.convertFilePathToUrl(reply.getUser().getProfilePictureUrl()));
        response.setCreatedAt(reply.getCreatedAt());
        response.setUpdatedAt(reply.getUpdatedAt());

        // Load files for this reply
        List<TicketFile> files = ticketFileRepository.findByReplyId(reply.getId());
        response.setFiles(files != null ? files.stream()
                .map(this::mapFileToResponse)
                .collect(Collectors.toList()) : new java.util.ArrayList<>());

        return response;
    }

    private TicketFileResponse mapFileToResponse(TicketFile file) {
        TicketFileResponse response = new TicketFileResponse();
        response.setId(file.getId());
        response.setFileName(file.getFileName());
        // Convert file path to API URL for frontend access
        response.setFileContent(com.dashboard.app.util.FileUrlUtil.convertFilePathToUrl(file.getFilePath()));
        response.setFileSize(file.getFileSize());
        response.setContentType(file.getContentType());
        response.setCreatedAt(file.getCreatedAt());
        return response;
    }
}

