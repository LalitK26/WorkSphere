package com.dashboard.app.util;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;

/**
 * Utility class for converting file paths to API URLs
 */
public class FileUrlUtil {

    /**
     * Convert file path to API URL for frontend access
     * Handles both absolute Windows paths and relative paths
     * Example: 
     *   "uploads/profile-images/file.jpg" -> "/api/files?path=uploads%2Fprofile-images%2Ffile.jpg"
     *   "C:/HostingSpaces/admin1/backend-runtime/uploads/profile-images/file.jpg" -> "/api/files?path=uploads%2Fprofile-images%2Ffile.jpg"
     * 
     * @param filePath The file path stored in database (can be absolute or relative)
     * @return API URL for accessing the file, or null if filePath is null/empty
     */
    public static String convertFilePathToUrl(String filePath) {
        if (filePath == null || filePath.isEmpty()) {
            return null;
        }
        // If it's already a URL (starts with http:// or https://), return as is
        // This handles legacy Cloudinary URLs that might still be in the database
        if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
            return filePath;
        }
        
        // Extract relative path from absolute path if needed
        String relativePath = extractRelativePath(filePath);
        
        // Convert relative path to API URL with proper encoding
        try {
            String encodedPath = URLEncoder.encode(relativePath, StandardCharsets.UTF_8.toString());
            return "/api/files?path=" + encodedPath;
        } catch (Exception e) {
            // Fallback to unencoded path if encoding fails
            return "/api/files?path=" + relativePath;
        }
    }
    
    /**
     * Extract relative path from absolute path
     * Handles Windows paths like "C:/HostingSpaces/admin1/backend-runtime/uploads/profile-images/file.jpg"
     * and extracts "uploads/profile-images/file.jpg"
     */
    private static String extractRelativePath(String filePath) {
        // Check if path is absolute (Windows: C:\ or C:/, Unix: /)
        if (Paths.get(filePath).isAbsolute()) {
            // Find common upload directory patterns
            String[] uploadPatterns = {
                "uploads/",
                "uploads\\",
                "/uploads/",
                "\\uploads\\",
                "backend-runtime/uploads/",
                "backend-runtime\\uploads\\"
            };
            
            // Normalize path separators to forward slashes for easier matching
            String normalizedPath = filePath.replace("\\", "/");
            
            // Try to find uploads directory in the path
            for (String pattern : uploadPatterns) {
                int index = normalizedPath.indexOf(pattern);
                if (index >= 0) {
                    // Extract everything after the pattern
                    String relative = normalizedPath.substring(index + pattern.length());
                    // Remove any leading slashes
                    while (relative.startsWith("/")) {
                        relative = relative.substring(1);
                    }
                    // Reconstruct with "uploads/" prefix
                    return "uploads/" + relative;
                }
            }
            
            // If no pattern found, try to extract from common Windows paths
            // Look for "uploads" directory
            int uploadsIndex = normalizedPath.toLowerCase().indexOf("uploads");
            if (uploadsIndex >= 0) {
                String relative = normalizedPath.substring(uploadsIndex);
                // Remove any leading slashes
                while (relative.startsWith("/")) {
                    relative = relative.substring(1);
                }
                return relative;
            }
            
            // Last resort: return the original path (might be relative already)
            return filePath;
        }
        
        // Already relative, return as is
        return filePath;
    }
}

