export async function processAnyImageToDataUrl(file: File, maxDimension = 720): Promise<string> {
  // Always read fallback DataURL if browser cannot draw image on canvas (e.g. SVG)
  const readAsDataUrl = (): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Could not read selected image'));
        }
      };
      reader.onerror = () => reject(new Error('Could not read selected image'));
      reader.readAsDataURL(file);
    });

  if (typeof document === 'undefined' || file.type === 'image/svg+xml') {
    return readAsDataUrl();
  }

  try {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Image decode error'));
        el.src = objectUrl;
      });

      const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const width = Math.max(1, Math.round((img.naturalWidth || maxDimension) * scale));
      const height = Math.max(1, Math.round((img.naturalHeight || maxDimension) * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return readAsDataUrl();

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', 0.86);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return readAsDataUrl();
  }
}
