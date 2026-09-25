/**
 * High-performance client-side image compressor and avatar optimizer.
 * Resizes large photos (e.g. from 10MB phone cameras) into crisp, compact
 * Web-ready thumbnails (<40KB) that save instantly without timeout or payload rejection.
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
}

export async function compressAndOptimizeImage(
  fileOrUrl: File | Blob | string,
  options: CompressOptions = {}
): Promise<{ dataUrl: string; blob: Blob; size: number }> {
  const {
    maxWidth = 360,
    maxHeight = 360,
    quality = 0.85,
    mimeType = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let objectUrlToRevoke: string | null = null;

    img.onload = () => {
      try {
        if (objectUrlToRevoke) {
          URL.revokeObjectURL(objectUrlToRevoke);
        }

        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate aspect-ratio preserving dimensions
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

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        // Bicubic smoothing for sharp avatar rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL(mimeType, quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({
                dataUrl,
                blob,
                size: blob.size,
              });
            } else {
              // Fallback blob creation from dataUrl
              const byteString = atob(dataUrl.split(',')[1]);
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              const fallbackBlob = new Blob([ab], { type: mimeType });
              resolve({
                dataUrl,
                blob: fallbackBlob,
                size: fallbackBlob.size,
              });
            }
          },
          mimeType,
          quality
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
      reject(new Error('Failed to load image for processing: ' + String(err)));
    };

    if (typeof fileOrUrl === 'string') {
      img.src = fileOrUrl;
    } else {
      objectUrlToRevoke = URL.createObjectURL(fileOrUrl);
      img.src = objectUrlToRevoke;
    }
  });
}
