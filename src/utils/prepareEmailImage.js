// Email content columns are ~600px wide; 1200px stays sharp on 2x screens.
const MAX_WIDTH = 1200;
// The upload is sent as base64 JSON, which adds a third to its size, and
// Vercel rejects request bodies over 4.5 MB. Keep the encoded image under 3 MB.
export const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

async function loadImage(file) {
  if (typeof createImageBitmap === "function") return createImageBitmap(file);
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not process the image."))),
      type,
      quality
    );
  });
}

/**
 * Scale an email image down to MAX_WIDTH and re-encode it so it uploads
 * (images between ~3.3 and 5 MB used to fail with HTTP 413) and recipients
 * don't download a full-size original. Returns the original file when it is
 * already small enough. GIFs are passed through, since redrawing one drops
 * its animation.
 *
 * @param {File} file
 * @param {string} contentType - detected type from validateImageFile
 * @returns {Promise<Blob>}
 */
export async function prepareEmailImage(file, contentType) {
  if (contentType === "image/gif") {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error("GIFs must be under 3 MB. They can't be resized without losing animation.");
    }
    return file;
  }

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_WIDTH / image.width);
  if (scale === 1 && file.size <= MAX_UPLOAD_BYTES) return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close?.();

  let blob = await toBlob(canvas, contentType, 0.85);
  if (blob.size > MAX_UPLOAD_BYTES && contentType !== "image/png") {
    blob = await toBlob(canvas, contentType, 0.7);
  }
  if (blob.size >= file.size && file.size <= MAX_UPLOAD_BYTES) return file;
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image is too large to upload. Try a smaller image.");
  }
  return blob;
}
