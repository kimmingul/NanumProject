/**
 * Client-side image resizing utility
 * Resizes images to a maximum dimension while maintaining aspect ratio
 * Converts to WebP format for optimal file size
 */

export interface ResizeOptions {
  maxSize: number;      // Maximum width/height in pixels
  quality: number;      // 0.0 to 1.0 (WebP quality)
  format: 'webp' | 'jpeg' | 'png';
}

const DEFAULT_OPTIONS: ResizeOptions = {
  maxSize: 128,
  quality: 0.85,
  format: 'webp',
};

/**
 * Resizes an image file to a smaller size using Canvas API
 * @param file - Original image file
 * @param options - Resize options (maxSize, quality, format)
 * @returns Promise<File> - Resized image as a File object
 */
export async function resizeImage(
  file: File,
  options: Partial<ResizeOptions> = {},
): Promise<File> {
  const { maxSize, quality, format } = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;

      if (width > height) {
        if (width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      const mimeType = `image/${format}`;
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }

          // Create new File with appropriate extension
          const ext = format === 'jpeg' ? 'jpg' : format;
          const fileName = file.name.replace(/\.[^/.]+$/, `.${ext}`);
          const resizedFile = new File([blob], fileName, { type: mimeType });

          resolve(resizedFile);
        },
        mimeType,
        quality,
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load image from file
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Resizes an image specifically for avatar use (128x128 WebP)
 * @param file - Original image file
 * @returns Promise<File> - Resized avatar image
 */
export async function resizeAvatar(file: File): Promise<File> {
  return resizeImage(file, {
    maxSize: 128,
    quality: 0.85,
    format: 'webp',
  });
}

/**
 * Resizes an image for logo use (height 128px, maintains aspect ratio)
 * @param file - Original image file
 * @returns Promise<File> - Resized logo image
 */
export async function resizeLogo(file: File): Promise<File> {
  const maxHeight = 128;
  const quality = 0.85;
  const format = 'webp';

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // Scale based on height only, maintain aspect ratio
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = `image/${format}`;
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          const fileName = file.name.replace(/\.[^/.]+$/, `.${format}`);
          const resizedFile = new File([blob], fileName, { type: mimeType });
          resolve(resizedFile);
        },
        mimeType,
        quality,
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}
