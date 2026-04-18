/**
 * Compresses an image file if it exceeds the specified size threshold
 * @param {File} file - The image file to compress
 * @param {number} maxSizeKB - Maximum size in KB before compression is applied (default: 500)
 * @param {number} maxWidth - Maximum width for the compressed image (default: 1920)
 * @param {number} maxHeight - Maximum height for the compressed image (default: 1920)
 * @param {number} quality - JPEG quality (0.0 to 1.0, default: 0.85)
 * @returns {Promise<File>} - Compressed file or original file if compression not needed
 */
export const compressImage = async (
  file,
  maxSizeKB = 500,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.85
) => {
  const maxSizeBytes = maxSizeKB * 1024;

  // If file is already small enough, return as-is
  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Use image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw the image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            // If compressed file is still larger than target, reduce quality further
            if (blob.size > maxSizeBytes) {
              // Try with lower quality
              canvas.toBlob(
                (lowerQualityBlob) => {
                  if (!lowerQualityBlob) {
                    // Fallback to first compressed version
                    const compressedFile = new File([blob], file.name, {
                      type: file.type || 'image/jpeg',
                      lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                    return;
                  }

                  const compressedFile = new File([lowerQualityBlob], file.name, {
                    type: file.type || 'image/jpeg',
                    lastModified: Date.now(),
                  });
                  resolve(compressedFile);
                },
                file.type || 'image/jpeg',
                Math.max(0.5, quality - 0.2) // Reduce quality but not too much
              );
            } else {
              const compressedFile = new File([blob], file.name, {
                type: file.type || 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            }
          },
          file.type || 'image/jpeg',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};
