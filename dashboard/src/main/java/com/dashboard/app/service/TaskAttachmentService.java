package com.dashboard.app.service;

import com.dashboard.app.dto.response.TaskResponse;
import com.dashboard.app.exception.ResourceNotFoundException;
import com.dashboard.app.model.Project;
import com.dashboard.app.model.ProjectFile;
import com.dashboard.app.model.Task;
import com.dashboard.app.model.User;
import com.dashboard.app.repository.ProjectFileRepository;
import com.dashboard.app.repository.TaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class TaskAttachmentService {

    private static final Logger logger = LoggerFactory.getLogger(TaskAttachmentService.class);

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private TaskService taskService;

    @Autowired
    private ProjectFileRepository projectFileRepository;

    @Autowired
    private FileStorageService fileStorageService;

    public TaskResponse upload(Long taskId, MultipartFile file, Long userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        // Upload file to local storage
        String filePath = fileStorageService.uploadTaskFile(file);

        // Store file path in attachmentPath (keeping field name for backward compatibility)
        task.setAttachmentName(file.getOriginalFilename());
        task.setAttachmentPath(filePath);
        task.setAttachmentContentType(file.getContentType());
        taskRepository.save(task);

        // Also create a ProjectFile entry if task has a project
        if (task.getProject() != null) {
            createProjectFileFromTaskAttachment(task, file, filePath);
        }

        return taskService.getTaskById(taskId, userId);
    }

    private void createProjectFileFromTaskAttachment(Task task, MultipartFile file, String filePath) {
        try {
            Project project = task.getProject();
            User uploader = task.getCreatedBy();

            if (project == null || uploader == null) {
                return;
            }

            // Create ProjectFile entry with file path
            ProjectFile projectFile = new ProjectFile();
            projectFile.setProject(project);
            projectFile.setUploadedBy(uploader);
            projectFile.setOriginalFileName(file.getOriginalFilename());
            projectFile.setCloudinaryUrl(filePath); // Store file path (keeping field name for compatibility)
            projectFile.setContentType(file.getContentType());
            projectFile.setSizeInBytes(file.getSize());

            projectFileRepository.save(projectFile);
        } catch (Exception exception) {
            // Log error but don't fail the task attachment upload
            logger.warn("Failed to create project file from task attachment: {}", exception.getMessage());
        }
    }

    public void delete(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        if (task.getAttachmentPath() == null) {
            return;
        }
        
        // Delete file from local storage
        fileStorageService.deleteFile(task.getAttachmentPath());
        
        task.setAttachmentName(null);
        task.setAttachmentPath(null);
        task.setAttachmentContentType(null);
        taskRepository.save(task);
    }

    public ResponseEntity<Resource> download(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        if (task.getAttachmentPath() == null) {
            throw new ResourceNotFoundException("Attachment not found");
        }
        
        // Load file from local storage and return as Resource
        Resource resource = fileStorageService.loadFileAsResource(task.getAttachmentPath());
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, 
                        "attachment; filename=\"" + task.getAttachmentName() + "\"")
                .header(HttpHeaders.CONTENT_TYPE, task.getAttachmentContentType())
                .body(resource);
    }
}


