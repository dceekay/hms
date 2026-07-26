export type CompressedImage = {
  dataUrl: string;
  mimeType: "image/webp";
  sizeBytes: number;
  width: number;
  height: number;
};

export async function compressImageToWebp(
  file: File,
  maxSize = 640,
  quality = 0.72
): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Unable to prepare image.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality)
  );

  bitmap.close();

  if (!blob) {
    throw new Error("Unable to compress image.");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read compressed image."));
    reader.readAsDataURL(blob);
  });

  return {
    dataUrl,
    mimeType: "image/webp",
    sizeBytes: blob.size,
    width,
    height,
  };
}
