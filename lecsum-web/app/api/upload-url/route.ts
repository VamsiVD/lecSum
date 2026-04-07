import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const ALLOWED_EXTENSIONS = new Set([
  // Audio
  "mp3", "wav", "m4a", "flac", "ogg", "webm", "amr",
  // Documents
  "pdf", "docx", "pptx",
  // Images
  "jpg", "jpeg", "png", "tiff",
]);

export async function POST(req: NextRequest) {
  try {
    const { filename, contentType } = await req.json();

    if (!filename) {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }

    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type: .${ext}` },
        { status: 400 }
      );
    }

    const command = new PutObjectCommand({
      Bucket: process.env.S3_UPLOAD_BUCKET!,
      Key: filename,
      ContentType: contentType || "application/octet-stream",
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 300 });
    return NextResponse.json({ url, key: filename });
  } catch (err) {
    console.error("Upload URL error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}