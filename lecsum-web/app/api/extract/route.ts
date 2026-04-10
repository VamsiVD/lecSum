import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { auth } from "@clerk/nextjs/server";

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

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0";

const EXTRACT_PROMPT = `You are extracting content from a document page for a student study assistant.

Extract ALL of the following:
1. Every word of text, preserving headings and structure
2. Describe any diagrams, charts, graphs, or figures in detail
3. Describe any tables — include all cell values
4. Note any mathematical equations or formulas

Format your response as plain text. For diagrams write [DIAGRAM: description]. For tables write [TABLE: description].
Be thorough — a student should be able to study from your output alone without seeing the original.`;

const IMAGE_MIME: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

async function updateDynamo(uploadKey: string, userId: string, status: string, transcriptKey?: string) {
  let expr = "SET #s = :s, userId = :uid";
  const names: Record<string, string> = { "#s": "status" };
  const values: Record<string, { S: string }> = {
    ":s": { S: status },
    ":uid": { S: userId },
  };
  if (transcriptKey) {
    expr += ", transcriptKey = :tk";
    values[":tk"] = { S: transcriptKey };
  }
  await dynamo.send(new UpdateItemCommand({
    TableName: "lecsum-jobs",
    Key: { uploadKey: { S: uploadKey } },
    UpdateExpression: expr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }));
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uploadKey } = await req.json();
  if (!uploadKey) {
    return NextResponse.json({ error: "Missing uploadKey" }, { status: 400 });
  }

  const ext = uploadKey.split(".").pop()?.toLowerCase() ?? "";
  const supported = new Set(["pdf", "jpg", "jpeg", "png"]);

  if (!supported.has(ext)) {
    return NextResponse.json(
      { error: `${ext.toUpperCase()} not yet supported. Please convert to PDF first.` },
      { status: 400 }
    );
  }

  try {
    // download from S3 — key already has userId prefix from upload-url route
    const obj = await s3.send(new GetObjectCommand({
      Bucket: process.env.S3_UPLOAD_BUCKET!,
      Key: uploadKey,
    }));
    const fileBytes = await obj.Body!.transformToByteArray();
    const base64 = Buffer.from(fileBytes).toString("base64");
    const isImage = ext in IMAGE_MIME;

    const content = isImage
      ? [
        { type: "image", source: { type: "base64", media_type: IMAGE_MIME[ext], data: base64 } },
        { type: "text", text: EXTRACT_PROMPT },
      ]
      : [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
        { type: "text", text: EXTRACT_PROMPT },
      ];

    const response = await bedrock.send(new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 8192,
        messages: [{ role: "user", content }],
      }),
    }));

    const raw = JSON.parse(new TextDecoder().decode(response.body));
    const extractedText: string = raw.content[0].text;

    // output key preserves userId prefix
    const outKey = uploadKey.replace(/\.[^.]+$/, ".txt");

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_TRANSCRIPTS_BUCKET!,
      Key: outKey,
      Body: extractedText,
      ContentType: "text/plain",
    }));

    await updateDynamo(uploadKey, userId, "done", outKey);

    return NextResponse.json({ success: true, transcriptKey: outKey });
  } catch (err) {
    console.error("Extract error:", err);
    await updateDynamo(uploadKey, userId, "error").catch(() => { });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}