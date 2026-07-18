import type { StoryImage } from './model';

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image data.'));
    reader.readAsDataURL(blob);
  });
}

function renderBitmap(bitmap: ImageBitmap, maxDimension: number, quality: number): Promise<string> {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('Could not prepare the image canvas.');
  context.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Could not optimize the image.'));
        return;
      }
      try {
        resolve(await blobToDataUrl(blob));
      } catch (error) {
        reject(error);
      }
    }, 'image/webp', quality);
  });
}

export async function prepareStoryImage(file: File): Promise<StoryImage> {
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const [dataUrl, thumbnailUrl] = await Promise.all([
        renderBitmap(bitmap, 1600, 0.84),
        renderBitmap(bitmap, 360, 0.76),
      ]);
      return {
        id: `image_${crypto.randomUUID()}`,
        name: file.name,
        dataUrl,
        thumbnailUrl,
      };
    } finally {
      bitmap.close();
    }
  } catch {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error ?? new Error('Could not read image data.'));
      reader.readAsDataURL(file);
    });
    return {
      id: `image_${crypto.randomUUID()}`,
      name: file.name,
      dataUrl,
      thumbnailUrl: dataUrl,
    };
  }
}
