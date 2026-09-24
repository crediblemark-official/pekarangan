/**
 * ============================================================================
 * PEKARANGAN - CAMERA & IMAGE COMPRESSION (TypeScript)
 * ============================================================================
 * Mengompresi foto dari kamera 50 MP menjadi maks 1280x720 piksel (< 800 KB)
 * dengan kualitas 0.7 JPEG/WebP secara client-side via Canvas API.
 */

export interface CompressionResult {
  base64: string;
  dataUrl: string;
  originalSizeKB: number;
  compressedSizeKB: number;
  width: number;
  height: number;
  mimeType: string;
}

export const CameraService = {
  async compressImage(
    file: File | Blob,
    maxWidth = 1280,
    maxHeight = 720,
    quality = 0.7
  ): Promise<CompressionResult> {
    if (!file || !file.type.startsWith("image/")) {
      throw new Error("File yang dipilih bukan merupakan format gambar.");
    }

    const originalSizeKB = Math.round(file.size / 1024);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
              const ratioW = maxWidth / width;
              const ratioH = maxHeight / height;
              const ratio = Math.min(ratioW, ratioH);

              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
              throw new Error("Gagal menginisialisasi 2D context canvas.");
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, 0, 0, width, height);

            const mimeType = "image/jpeg";
            const dataUrl = canvas.toDataURL(mimeType, quality);
            const base64Length = dataUrl.length - (dataUrl.indexOf(",") + 1);
            const compressedSizeKB = Math.round((base64Length * 3) / 4 / 1024);

            resolve({
              base64: dataUrl,
              dataUrl,
              originalSizeKB,
              compressedSizeKB,
              width,
              height,
              mimeType
            });
          } catch (err: any) {
            reject(new Error("Gagal mengompresi gambar: " + err.message));
          }
        };

        img.onerror = () => reject(new Error("Gagal memproses file foto."));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
      reader.readAsDataURL(file);
    });
  }
};
