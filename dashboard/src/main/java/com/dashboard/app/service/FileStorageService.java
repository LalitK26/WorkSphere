package com.dashboard.app.service;

import com.dashboard.app.exception.BadRequestException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Logger logger = LoggerFactory.getLogger(FileStorageService.class);
    
    private boolean directoriesInitialized = false;

    // Profile image constraints
    private static final long PROFILE_IMAGE_MAX_SIZE = 1024 * 1024; // 1 MB
    private static final String[] PROFILE_IMAGE_ALLOWED_TYPES = {"jpg", "jpeg", "png", "webp"};

    // Project/Task file constraints
    private static final long PROJECT_FILE_MAX_SIZE = 20 * 1024 * 1024; // 20 MB
    private static final String[] PROJECT_FILE_ALLOWED_TYPES = {"pdf", "doc", "docx", "xls", "xlsx", "csv", "png", "jpg", "jpeg", "zip", "txt"};

    // Resume file constraints
    private static final long RESUME_FILE_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    private static final String[] RESUME_FILE_ALLOWED_TYPES = {"pdf", "doc", "docx"};

    // Experience Letter file constraints
    private static final long EXPERIENCE_LETTER_FILE_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    private static final String[] EXPERIENCE_LETTER_FILE_ALLOWED_TYPES = {"pdf", "doc", "docx"};

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    /**
     * Initialize upload directories on service creation
     */
    @PostConstruct
    private void initializeDirectories() {
        if (directoriesInitialized) {
            return;
        }
        
        try {
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            
            // Create subdirectories
            Path profileImagesPath = Paths.get(uploadDir, "profile-images");
            Path projectFilesPath = Paths.get(uploadDir, "project-files");
            Path taskFilesPath = Paths.get(uploadDir, "task-files");
            Path ticketFilesPath = Paths.get(uploadDir, "ticket-files");
            Path resumeFilesPath = Paths.get(uploadDir, "resume-files");
            Path experienceLetterFilesPath = Paths.get(uploadDir, "experience-letters");
            
            Files.createDirectories(profileImagesPath);
            Files.createDirectories(projectFilesPath);
            Files.createDirectories(taskFilesPath);
            Files.createDirectories(ticketFilesPath);
            Files.createDirectories(resumeFilesPath);
            Files.createDirectories(experienceLetterFilesPath);
            
            directoriesInitialized = true;
            logger.info("File storage directories initialized at: {}", uploadDir);
        } catch (IOException e) {
            logger.error("Failed to create upload directories", e);
            throw new RuntimeException("Failed to initialize file storage", e);
        }
    }

    /**
     * Upload profile image with validation
     */
    public String uploadProfileImage(MultipartFile file) {
        validateProfileImage(file);
        
        try {
            String fileName = generateUniqueFileName(file.getOriginalFilename(), "profile-images");
            Path targetLocation = Paths.get(uploadDir, "profile-images", fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            
            // Return RELATIVE path for storage in database (portable across servers)
            return "profile-images/" + fileName;
        } catch (IOException e) {
            logger.error("Failed to upload profile image", e);
            throw new RuntimeException("Failed to upload profile image", e);
        }
    }

    /**
     * Upload file from base64 string (for tickets)
     */
    public String uploadFileFromBase64(String base64Content, String fileName, String contentType, long fileSize) {
        // Validate input parameters
        if (base64Content == null || base64Content.isEmpty()) {
            throw new BadRequestException("File content cannot be null or empty");
        }
        
        if (fileName == null || fileName.isEmpty()) {
            throw new BadRequestException("File name cannot be null or empty");
        }
        
        // Validate file size
        if (fileSize > PROJECT_FILE_MAX_SIZE) {
            throw new BadRequestException(
                    String.format("File size must be less than %d MB", PROJECT_FILE_MAX_SIZE / (1024 * 1024))
            );
        }

        // Extract base64 data (remove data:image/...;base64, prefix if present)
        String base64Data = base64Content;
        if (base64Content.contains(",")) {
            base64Data = base64Content.substring(base64Content.indexOf(",") + 1);
        }

        try {
            byte[] fileBytes = java.util.Base64.getDecoder().decode(base64Data);
            
            String uniqueFileName = generateUniqueFileName(fileName, "ticket-files");
            Path targetLocation = Paths.get(uploadDir, "ticket-files", uniqueFileName);
            
            // Ensure directory exists
            Files.createDirectories(targetLocation.getParent());
            
            Files.write(targetLocation, fileBytes);
            
            // Return RELATIVE path for storage in database (portable across servers)
            String relativePath = "ticket-files/" + uniqueFileName;
            
            // Validate path length (database column is VARCHAR(1000))
            if (relativePath.length() > 1000) {
                throw new BadRequestException("File path is too long. Please use a shorter file name.");
            }
            
            logger.info("File uploaded successfully: fileName={}, filePath={}, size={} bytes", 
                fileName, relativePath, fileBytes.length);
            
            return relativePath;
        } catch (IllegalArgumentException e) {
            logger.error("Invalid base64 content for file: {}", fileName, e);
            throw new BadRequestException("Invalid file content format: " + e.getMessage());
        } catch (Exception e) {
            logger.error("Failed to upload file from base64: {}", fileName, e);
            throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
        }
    }

    /**
     * Upload project file with validation
     */
    public String uploadProjectFile(MultipartFile file) {
        validateProjectFile(file);

        try {
            String fileName = generateUniqueFileName(file.getOriginalFilename(), "project-files");
            Path targetLocation = Paths.get(uploadDir, "project-files", fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            
            // Return RELATIVE path for storage in database (portable across servers)
            return "project-files/" + fileName;
        } catch (IOException e) {
            logger.error("Failed to upload project file", e);
            throw new RuntimeException("Failed to upload project file", e);
        }
    }

    /**
     * Upload task file (uses same validation as project files)
     */
    public String uploadTaskFile(MultipartFile file) {
        validateProjectFile(file);

        try {
            String fileName = generateUniqueFileName(file.getOriginalFilename(), "task-files");
            Path targetLocation = Paths.get(uploadDir, "task-files", fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            
            // Return RELATIVE path for storage in database (portable across servers)
            return "task-files/" + fileName;
        } catch (IOException e) {
            logger.error("Failed to upload task file", e);
            throw new RuntimeException("Failed to upload task file", e);
        }
    }

    /**
     * Upload resume file with validation
     */
    public String uploadResumeFile(MultipartFile file) {
        validateResumeFile(file);

        try {
            String fileName = generateUniqueFileName(file.getOriginalFilename(), "resume-files");
            Path targetLocation = Paths.get(uploadDir, "resume-files", fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            
            // Return RELATIVE path for storage in database (portable across servers)
            return "resume-files/" + fileName;
        } catch (IOException e) {
            logger.error("Failed to upload resume file", e);
            throw new RuntimeException("Failed to upload resume file", e);
        }
    }

    /**
     * Upload experience letter file with validation
     */
    public String uploadExperienceLetterFile(MultipartFile file) {
        validateExperienceLetterFile(file);

        try {
            String fileName = generateUniqueFileName(file.getOriginalFilename(), "experience-letters");
            Path targetLocation = Paths.get(uploadDir, "experience-letters", fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            
            // Return RELATIVE path for storage in database (portable across servers)
            return "experience-letters/" + fileName;
        } catch (IOException e) {
            logger.error("Failed to upload experience letter file", e);
            throw new RuntimeException("Failed to upload experience letter file", e);
        }
    }

    /**
     * Delete file by path
     */
    public void deleteFile(String filePath) {
        if (filePath == null || filePath.isEmpty()) {
            return;
        }

        try {
            Path file;
            // If path is absolute, use it directly
            if (Paths.get(filePath).isAbsolute()) {
                file = Paths.get(filePath);
            } else {
                // Check if filePath already starts with uploadDir
                // If it does, extract the relative path and resolve it the same way files are saved
                // Otherwise, resolve relative to upload directory
                if (filePath.startsWith(uploadDir + "/") || filePath.startsWith(uploadDir + "\\")) {
                    // Path already includes upload directory (e.g., "uploads/profile-images/file.jpg")
                    // Extract the part after uploadDir and resolve it using Paths.get(uploadDir, ...)
                    String relativePath = filePath.substring(uploadDir.length());
                    // Remove leading slash or backslash
                    if (relativePath.startsWith("/") || relativePath.startsWith("\\")) {
                        relativePath = relativePath.substring(1);
                    }
                    // Normalize path separators to forward slashes
                    String normalizedPath = relativePath.replace("\\", "/");
                    // Resolve step by step to match how files are saved
                    Path basePath = Paths.get(uploadDir);
                    for (String part : normalizedPath.split("/")) {
                        if (!part.isEmpty()) {
                            basePath = basePath.resolve(part);
                        }
                    }
                    file = basePath.normalize();
                } else {
                    // Resolve relative to upload directory
                    file = Paths.get(uploadDir).resolve(filePath).normalize();
                }
            }
            
            if (Files.exists(file)) {
                Files.delete(file);
                logger.info("Deleted file: {}", file.toAbsolutePath());
            }
        } catch (Exception e) {
            // Log error but don't throw - file might already be deleted
            logger.warn("Failed to delete file: {}", e.getMessage());
        }
    }

    /**
     * Load file as Resource for download
     */
    public Resource loadFileAsResource(String filePath) {
        try {
            if (filePath == null || filePath.trim().isEmpty()) {
                throw new RuntimeException("File path is null or empty");
            }
            
            Path file;
            Path filePathObj = Paths.get(filePath);
            String normalizedPath = filePath.replace("\\", "/");
            String normalizedUploadDir = uploadDir.replace("\\", "/");
            
            logger.info("Loading file - original path: {}, uploadDir: {}", filePath, uploadDir);
            
            // If path is absolute, check if it's within upload directory or use it directly
            if (filePathObj.isAbsolute()) {
                Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
                Path absoluteFilePath = filePathObj.toAbsolutePath().normalize();
                
                // Check if absolute path is within upload directory
                if (absoluteFilePath.startsWith(uploadPath)) {
                    file = absoluteFilePath;
                    logger.debug("Using absolute path within upload dir: {}", file);
                } else {
                    // Absolute path but not in upload dir - might be from old storage or different upload location
                    // Try to extract the relative part after any "uploads" or known subdirectory
                    String relativePart = extractRelativePath(normalizedPath);
                    if (relativePart != null) {
                        file = Paths.get(uploadDir).resolve(relativePart).normalize();
                        logger.debug("Resolved from absolute path with relative extraction: {}", file);
                    } else {
                        // Last resort: use absolute path as-is
                        file = filePathObj;
                        logger.debug("Using absolute path as-is: {}", file);
                    }
                }
            } else {
                // Relative path - check if it starts with uploadDir or just the subdirectory
                // Remove uploadDir prefix if present
                if (normalizedPath.startsWith(normalizedUploadDir + "/") || normalizedPath.startsWith(normalizedUploadDir + "\\")) {
                    String relativePath = normalizedPath.substring(normalizedUploadDir.length());
                    // Remove leading slash
                    while (relativePath.startsWith("/") || relativePath.startsWith("\\")) {
                        relativePath = relativePath.substring(1);
                    }
                    file = Paths.get(uploadDir).resolve(relativePath).normalize();
                } else if (normalizedPath.startsWith("uploads/")) {
                    // Path starts with "uploads/" - remove it and resolve
                    String relativePath = normalizedPath.substring("uploads/".length());
                    file = Paths.get(uploadDir).resolve(relativePath).normalize();
                } else if (isKnownSubdirectoryPath(normalizedPath)) {
                    // Path starts with a known subdirectory (e.g., "offer-documents/", "profile-images/")
                    // Resolve directly relative to uploadDir
                    file = Paths.get(uploadDir).resolve(normalizedPath).normalize();
                    logger.debug("Resolved known subdirectory path: {} -> {}", normalizedPath, file);
                } else {
                    // Resolve relative to upload directory
                    file = Paths.get(uploadDir).resolve(filePath).normalize();
                }
            }
            
            logger.info("Loading file from path: {} -> resolved to: {}", filePath, file.toAbsolutePath());
            
            // Check if file exists
            if (!Files.exists(file)) {
                logger.error("File does not exist: {} (resolved to: {})", filePath, file.toAbsolutePath());
                throw new RuntimeException("File not found: " + filePath + " (resolved to: " + file.toAbsolutePath() + ")");
            }
            
            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                logger.error("File not found or not readable: {} (resolved to: {})", filePath, file.toAbsolutePath());
                throw new RuntimeException("File not found or not readable: " + filePath);
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Failed to load file as resource: {}", filePath, e);
            throw new RuntimeException("File not found: " + filePath, e);
        }
    }
    
    /**
     * Extract relative path from an absolute path by finding known subdirectories
     */
    private String extractRelativePath(String absolutePath) {
        String normalized = absolutePath.replace("\\", "/");
        
        // Known subdirectories that files might be stored in
        String[] knownSubdirs = {
            "offer-documents/", "profile-images/", "project-files/", 
            "task-files/", "ticket-files/", "resume-files/", "experience-letters/"
        };
        
        for (String subdir : knownSubdirs) {
            int index = normalized.indexOf(subdir);
            if (index >= 0) {
                return normalized.substring(index);
            }
        }
        
        // Try to find "uploads/" and extract everything after it
        int uploadsIndex = normalized.toLowerCase().indexOf("uploads/");
        if (uploadsIndex >= 0) {
            String afterUploads = normalized.substring(uploadsIndex + "uploads/".length());
            // Don't return if it's empty or just slashes
            if (!afterUploads.trim().isEmpty() && !afterUploads.equals("/")) {
                return afterUploads;
            }
        }
        
        return null;
    }
    
    /**
     * Check if the path starts with a known subdirectory
     */
    private boolean isKnownSubdirectoryPath(String path) {
        String normalized = path.replace("\\", "/");
        
        // Known subdirectories that files might be stored in
        String[] knownSubdirs = {
            "offer-documents/", "profile-images/", "project-files/", 
            "task-files/", "ticket-files/", "resume-files/", "experience-letters/"
        };
        
        for (String subdir : knownSubdirs) {
            if (normalized.startsWith(subdir)) {
                return true;
            }
        }
        
        return false;
    }

    private void validateProfileImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Profile image file is required");
        }

        // Check file size
        if (file.getSize() > PROFILE_IMAGE_MAX_SIZE) {
            throw new BadRequestException(
                    String.format("Profile image size must be less than %d MB", PROFILE_IMAGE_MAX_SIZE / (1024 * 1024))
            );
        }

        // Check file type
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            throw new BadRequestException("Invalid file name");
        }

        String extension = getFileExtension(originalFilename).toLowerCase();
        if (!Arrays.asList(PROFILE_IMAGE_ALLOWED_TYPES).contains(extension)) {
            throw new BadRequestException(
                    String.format("Profile image must be one of: %s", String.join(", ", PROFILE_IMAGE_ALLOWED_TYPES))
            );
        }

        // Check content type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new BadRequestException("File must be an image");
        }
    }

    private void validateProjectFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is required");
        }

        // Check file size
        if (file.getSize() > PROJECT_FILE_MAX_SIZE) {
            throw new BadRequestException(
                    String.format("File size must be less than %d MB", PROJECT_FILE_MAX_SIZE / (1024 * 1024))
            );
        }

        // Check file type
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            throw new BadRequestException("Invalid file name");
        }

        String extension = getFileExtension(originalFilename).toLowerCase();
        if (!Arrays.asList(PROJECT_FILE_ALLOWED_TYPES).contains(extension)) {
            throw new BadRequestException(
                    String.format("File must be one of: %s", String.join(", ", PROJECT_FILE_ALLOWED_TYPES))
            );
        }
    }

    private void validateResumeFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Resume file is required");
        }

        // Check file size
        if (file.getSize() > RESUME_FILE_MAX_SIZE) {
            throw new BadRequestException(
                    String.format("Resume file size must be less than %d MB", RESUME_FILE_MAX_SIZE / (1024 * 1024))
            );
        }

        // Check file type
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            throw new BadRequestException("Invalid file name");
        }

        String extension = getFileExtension(originalFilename).toLowerCase();
        if (!Arrays.asList(RESUME_FILE_ALLOWED_TYPES).contains(extension)) {
            throw new BadRequestException(
                    String.format("Resume file must be one of: %s", String.join(", ", RESUME_FILE_ALLOWED_TYPES))
            );
        }
    }

    private void validateExperienceLetterFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Experience letter file is required");
        }

        // Check file size
        if (file.getSize() > EXPERIENCE_LETTER_FILE_MAX_SIZE) {
            throw new BadRequestException(
                    String.format("Experience letter file size must be less than %d MB", EXPERIENCE_LETTER_FILE_MAX_SIZE / (1024 * 1024))
            );
        }

        // Check file type
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            throw new BadRequestException("Invalid file name");
        }

        String extension = getFileExtension(originalFilename).toLowerCase();
        if (!Arrays.asList(EXPERIENCE_LETTER_FILE_ALLOWED_TYPES).contains(extension)) {
            throw new BadRequestException(
                    String.format("Experience letter file must be one of: %s", String.join(", ", EXPERIENCE_LETTER_FILE_ALLOWED_TYPES))
            );
        }
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1);
    }

    private String generateUniqueFileName(String originalFilename, String subfolder) {
        String extension = getFileExtension(originalFilename);
        String baseName = originalFilename != null && originalFilename.contains(".")
                ? originalFilename.substring(0, originalFilename.lastIndexOf("."))
                : "file";
        
        // Sanitize filename
        baseName = baseName.replaceAll("[^a-zA-Z0-9._-]", "_");
        
        String uniqueId = UUID.randomUUID().toString();
        return baseName + "_" + uniqueId + (extension.isEmpty() ? "" : "." + extension);
    }
}

