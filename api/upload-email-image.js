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

  const auth = await authorize(req.headers.authorization, body.requesterCode);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: "Unauthorized." });
  }

  const { data, filename, contentType } = body;
  if (!data || !filename || !contentType) {
    return res.status(400).json({ error: "data, filename, and contentType are required." });
  }

  if (!contentType.startsWith("image/")) {
    return res.status(400).json({ error: "Only image files are allowed." });
  }

  const buffer = Buffer.from(data, "base64");
  if (buffer.length > MAX_SIZE) {
    return res.status(400).json({ error: "Image must be under 5 MB." });
  }

  const key = `email-images/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

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
        ContentType: contentType,
      })
    );
  } catch (e) {
    console.error("S3 upload failed:", e?.message || e);
    return res.status(500).json({ error: "Failed to upload image." });
  }

  const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  return res.status(200).json({ url });
}
