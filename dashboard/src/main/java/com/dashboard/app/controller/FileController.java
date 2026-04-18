package com.dashboard.app.controller;

import com.dashboard.app.service.FileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*")
public class FileController {

    private static final Logger logger = LoggerFactory.getLogger(FileController.class);

    @Autowired
    private FileStorageService fileStorageService;

    /**
     * Serve files from uploads directory
     * Example: /api/files?path=uploads/profile-images/filename.jpg
     */
    @GetMapping
    public ResponseEntity<Resource> serveFile(@RequestParam String path) {
        try {
            // Validate path parameter
            if (path == null || path.trim().isEmpty()) {
                logger.error("File path is null or empty");
                return ResponseEntity.badRequest().build();
            }
            
            // Check for incomplete URL encoding (e.g., path ending with %2 instead of %2F)
            if (path.matches(".*%[0-9A-Fa-f]?$")) {
                logger.error("Incomplete URL encoding detected in path: {}", path);
                return ResponseEntity.badRequest().build();
            }
            
            // Decode URL-encoded path if needed
            String decodedPath = java.net.URLDecoder.decode(path, java.nio.charset.StandardCharsets.UTF_8);
            logger.info("Serving file - original path: {}, decoded path: {}", path, decodedPath);
            
            // Validate decoded path has a proper filename
            if (decodedPath.endsWith("/") || decodedPath.endsWith("\\")) {
                logger.error("Path is a directory, not a file: {}", decodedPath);
                return ResponseEntity.badRequest().build();
            }
            
            Resource resource = fileStorageService.loadFileAsResource(decodedPath);
            
            // Determine content type based on file extension
            String contentType = "application/octet-stream";
            String lowerPath = decodedPath.toLowerCase();
            if (lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")) {
                contentType = "image/jpeg";
            } else if (lowerPath.endsWith(".png")) {
                contentType = "image/png";
            } else if (lowerPath.endsWith(".webp")) {
                contentType = "image/webp";
            } else if (lowerPath.endsWith(".pdf")) {
                contentType = "application/pdf";
            } else if (lowerPath.endsWith(".doc")) {
                contentType = "application/msword";
            } else if (lowerPath.endsWith(".docx")) {
                contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            } else if (lowerPath.endsWith(".xls")) {
                contentType = "application/vnd.ms-excel";
            } else if (lowerPath.endsWith(".xlsx")) {
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            } else if (lowerPath.endsWith(".zip")) {
                contentType = "application/zip";
            }
            
            // Extract filename from path for Content-Disposition header
            String filename = decodedPath.substring(decodedPath.lastIndexOf("/") + 1);
            
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000") // Cache for 1 year
                    .body(resource);
        } catch (RuntimeException e) {
            logger.error("Failed to serve file: {} - Error: {}", path, e.getMessage());
            if (e.getMessage() != null && e.getMessage().contains("File not found")) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        } catch (Exception e) {
            logger.error("Failed to serve file: {}", path, e);
            return ResponseEntity.notFound().build();
        }
    }
}

