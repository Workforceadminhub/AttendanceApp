/**
 * Vercel serverless function — POST /api/upload-email-image
 *
 * Accepts a base64-encoded image, uploads it to AWS S3, and returns the
 * public URL. The bucket must have public read access or a CloudFront
 * distribution in front of it.
 *
 * Request body: { data: string (base64), filename: string, contentType: string }
 * Response:     { url: string }
 *
 * Env: AWS_S3_BUCKET, AWS_S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { authorize } from "./_lib/auth.js";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/** Detect image type from magic bytes. Returns { contentType, ext } or null. */
function detectImage(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { contentType: "image/jpeg", ext: "jpg" };
  }
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { contentType: "image/png", ext: "png" };
  }
  if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) {
    return { contentType: "image/gif", ext: "gif" };
  }
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { contentType: "image/webp", ext: "webp" };
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_S3_REGION || "eu-west-1";
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!bucket || !accessKeyId || !secretAccessKey) {
    console.error("S3 config check:", {
      bucket: !!bucket,
      accessKeyId: !!accessKeyId,
      secretAccessKey: !!secretAccessKey,
    });
    return res.status(500).json({ error: "AWS S3 is not configured." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      return res.status(400).json({ error: "Invalid JSON body." });
    }
  }
  body = body || {};

  const auth = await authorize(req.headers.authorization);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: "Unauthorized." });
  }

  const { data, filename, contentType } = body;
  if (!data || !filename || !contentType) {
    return res.status(400).json({ error: "data, filename, and contentType are required." });
  }

  if (typeof contentType !== "string" || !contentType.startsWith("image/")) {
    return res.status(400).json({ error: "Only image files are allowed." });
  }

  // Check the encoded size before decoding so oversized payloads never get buffered.
  if (typeof data !== "string" || Math.floor((data.length * 3) / 4) > MAX_SIZE) {
    return res.status(400).json({ error: "Image must be under 5 MB." });
  }

  const buffer = Buffer.from(data, "base64");
  if (buffer.length > MAX_SIZE) {
    return res.status(400).json({ error: "Image must be under 5 MB." });
  }

  // Trust the bytes, not the caller's contentType (rejects SVG and non-images).
  const detected = detectImage(buffer);
  if (!detected) {
    return res.status(400).json({ error: "Only JPEG, PNG, GIF, or WEBP images are allowed." });
  }

  const baseName = String(filename)
    .replace(/\.[^.]*$/, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_") || "image";
  const key = `email-images/${Date.now()}-${baseName}.${detected.ext}`;

  const s3 = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: detected.contentType,
      })
    );
  } catch (e) {
    console.error("S3 upload failed:", e?.message || e);
    return res.status(500).json({ error: "Failed to upload image." });
  }

  const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  return res.status(200).json({ url });
}
