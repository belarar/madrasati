/**
 * Client-Side Smart File & Image Compressor
 * يضمن ضغط صور الكراريس والسبورات والملفات تلقائياً لتوفير المساحة ومنع امتلاء ذاكرة المتصفح
 */

export interface ProcessedFile {
  name: string;
  sizeFormatted: string;
  sizeBytes: number;
  dataUrl: string;
  format: 'image' | 'pdf' | 'docx' | 'other';
  wasCompressed: boolean;
}

/**
 * Compress an image file using HTML5 Canvas to drastically reduce storage footprint
 * while keeping handwritten text and diagrams perfectly legible.
 */
export async function processAndCompressFile(
  file: File,
  maxDimension = 1280,
  quality = 0.75
): Promise<ProcessedFile> {
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp)$/i.test(file.name);
  let format: 'image' | 'pdf' | 'docx' | 'other' = 'other';

  if (file.type.includes('pdf') || file.name.endsWith('.pdf')) {
    format = 'pdf';
  } else if (file.type.includes('word') || /\.(docx?)$/i.test(file.name)) {
    format = 'docx';
  } else if (isImage) {
    format = 'image';
  }

  // Format size helper
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} كيلوبايت`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
  };

  // If it's an image, optimize and compress it
  if (isImage) {
    try {
      const compressedDataUrl = await compressImage(file, maxDimension, quality);
      // Calculate approximate size of base64
      const head = 'data:image/jpeg;base64,';
      const base64Length = compressedDataUrl.length - (compressedDataUrl.indexOf(',') + 1);
      const approximateBytes = Math.round((base64Length * 3) / 4);

      return {
        name: file.name.replace(/\.[^/.]+$/, '') + '.jpg',
        sizeFormatted: formatBytes(approximateBytes),
        sizeBytes: approximateBytes,
        dataUrl: compressedDataUrl,
        format: 'image',
        wasCompressed: true,
      };
    } catch {
      // Fallback to normal FileReader if canvas fails
    }
  }

  // Standard reader for non-images or fallback
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        sizeFormatted: formatBytes(file.size),
        sizeBytes: file.size,
        dataUrl: reader.result as string,
        format,
        wasCompressed: false,
      });
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

function compressImage(file: File, maxDimension: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Fill white background for transparent PNGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error('فشل معالجة الصورة'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
}
