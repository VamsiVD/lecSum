import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@clerk/nextjs/server";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

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

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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