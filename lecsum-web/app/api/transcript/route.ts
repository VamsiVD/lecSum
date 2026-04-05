import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand, NoSuchKey } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  if (key.includes("..") || key.startsWith("/")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  // Same default as lambdas/transcript_parser (OUTPUT_BUCKET); override with S3_TRANSCRIPT_BUCKET.
  const bucket =
    process.env.S3_TRANSCRIPTS_BUCKET ?? "lecsum-transcripts-text";

  try {
    const result = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );
    const text = await result.Body?.transformToString("utf-8");
    if (text === undefined) {
      return NextResponse.json({ error: "Empty transcript" }, { status: 404 });
    }
    return NextResponse.json({ text });
  } catch (err) {
    if (err instanceof NoSuchKey) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const code = (err as { name?: string })?.name;
    if (code === "NoSuchKey") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("transcript error:", err);
    return NextResponse.json({ error: "Failed to load transcript" }, { status: 500 });
  }
}
