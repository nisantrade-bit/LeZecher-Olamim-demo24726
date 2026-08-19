import { isSupabaseConfigured } from './supabase';

/**
 * Central Image Normalizer (3:4 Aspect Ratio, 900x1200 JPEG)
 * Accepts any source image (File, Blob, Data URL, HTTP/HTTPS URL)
 * and returns a standard 900x1200 JPEG File object with 3:4 aspect ratio (0.75).
 */
export async function normalizeImageTo3x4(
  input: File | Blob | string,
  filename: string = 'memorial_photo.jpg'
): Promise<File> {
  const safeFilename = filename.replace(/\.[^/.]+$/, "") + ".jpg";
  return normalizeInBrowser(input, safeFilename);
}

/**
 * Converts a File or Blob into a Base64 Data URL.
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || '');
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Browser-side implementation using HTML5 Canvas (900x1200 JPEG, 3:4 aspect ratio)
 */
async function normalizeInBrowser(
  input: File | Blob | string,
  safeFilename: string
): Promise<File> {
  let imgElement: HTMLImageElement;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('data:image/') || trimmed.startsWith('data:')) {
      imgElement = await loadImageElement(trimmed);
    } else {
      let blob: Blob | null = null;
      try {
        const res = await fetch(trimmed);
        if (res.ok) {
          blob = await res.blob();
        }
      } catch (e) {
        // CORS or fetch failure: fallback to server proxy below
      }

      if (!blob && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
        try {
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(trimmed)}`;
          const proxyRes = await fetch(proxyUrl);
          if (proxyRes.ok) {
            blob = await proxyRes.blob();
          }
        } catch (e) {
          console.warn('[proxy-image client fallback failed]', e);
        }
      }

      if (blob) {
        const objectUrl = URL.createObjectURL(blob);
        try {
          imgElement = await loadImageElement(objectUrl);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      } else {
        imgElement = await loadImageElement(trimmed, true);
      }
    }
  } else {
    const objectUrl = URL.createObjectURL(input);
    try {
      imgElement = await loadImageElement(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Fill dark background matching app theme
  ctx.fillStyle = '#080c14';
  ctx.fillRect(0, 0, 900, 1200);

  // Aspect ratio contain calculation
  const scale = Math.min(900 / imgElement.width, 1200 / imgElement.height);
  const drawW = imgElement.width * scale;
  const drawH = imgElement.height * scale;
  const dx = (900 - drawW) / 2;
  const dy = (1200 - drawH) / 2;

  ctx.drawImage(imgElement, dx, dy, drawW, drawH);

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create Blob from canvas'));
        return;
      }
      const file = new File([blob], safeFilename, { type: 'image/jpeg', lastModified: Date.now() });
      resolve(file);
    }, 'image/jpeg', 0.85);
  });
}

function loadImageElement(src: string, useCrossOrigin: boolean = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (useCrossOrigin) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image from source`));
    img.src = src;
  });
}

