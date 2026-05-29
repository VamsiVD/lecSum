import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@clerk/nextjs/server";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { sanitizeFilename } from "@/lib/sanitize";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const dynamo = new DynamoDBClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const ALLOWED_EXTENSIONS = new Set([
  "mp3", "wav", "m4a", "flac", "ogg", "webm", "amr",
  "pdf", "docx", "pptx",
  "jpg", "jpeg", "png", "tiff",
]);

const MAX_BYTES: Record<string, number> = {
  audio: 200 * 1024 * 1024, //  200 MB
  doc:    50 * 1024 * 1024, //   50 MB
  image:  20 * 1024 * 1024, //   20 MB
};

function maxBytesForExt(ext: string): number {
  if (["mp3","wav","m4a","flac","ogg","webm","amr"].includes(ext)) return MAX_BYTES.audio;
  if (["pdf","docx","pptx"].includes(ext))                          return MAX_BYTES.doc;
  return MAX_BYTES.image;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename: rawFilename, contentType, fileSize } = await req.json();

    const filename = sanitizeFilename(rawFilename);
    if (!filename) {
      return NextResponse.json({ error: "Missing or invalid filename" }, { status: 400 });
    }

    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type: .${ext}` },
        { status: 400 }
      );
    }

    if (typeof fileSize === "number") {
      const limit = maxBytesForExt(ext);
      if (fileSize > limit) {
        const limitMB = limit / 1024 / 1024;
        return NextResponse.json(
          { error: `File too large. Max size for .${ext} is ${limitMB} MB.` },
          { status: 413 }
        );
      }
    }

    const key = `${userId}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_UPLOAD_BUCKET!,
      Key: key,
      ContentType: contentType || "application/octet-stream",
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 300 });

    // pre-create DynamoDB record with userId so polls find it immediately
    await dynamo.send(new PutItemCommand({
      TableName: "lecsum-jobs",
      Item: {
        uploadKey: { S: key },
        fileName: { S: filename },
        displayName: { S: filename.replace(/\.[^.]+$/, "") },
        status: { S: "uploading" },
        userId: { S: userId },
        createdAt: { S: new Date().toISOString() },
      },
      ConditionExpression: "attribute_not_exists(uploadKey)",
    })).catch(() => { }); // non-blocking — don't fail if record already exists

    return NextResponse.json({ url, key });
  } catch (err) {
    console.error("Upload URL error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}