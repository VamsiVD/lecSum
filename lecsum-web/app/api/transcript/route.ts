import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");

  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  // key from the upload is the raw audio key e.g. "abc123-1234567890.mp3"
  // the parser saves the transcript as the same name but .txt
  const txtKey = key.replace(/\.[^.]+$/, ".txt");

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_TRANSCRIPTS_BUCKET!,
      Key: txtKey,
    });

    const response = await s3.send(command);
    const text = await response.Body?.transformToString("utf-8");

    if (!text) throw new Error("Empty transcript");

    return new NextResponse(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("Error fetching transcript:", err);
    return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
  }
}