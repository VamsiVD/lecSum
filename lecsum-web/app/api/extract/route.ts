import { NextRequest, NextResponse } from "next/server";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

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

// Claude 3.5 Haiku on Bedrock — best quality/cost for document extraction
const MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0";

const EXTRACT_PROMPT = `You are an educational study assistant extracting text from a document page.

Your goal is to extract strictly academic and educational content following these rules:
1. Extract the text, preserving headings and logical structure.
2. Describe any diagrams, charts, graphs, or figures in detail (explain axis labels, trends, key values). Format as [DIAGRAM: description].
3. Describe any tables, including all cell values. Format as [TABLE: description].
4. Note any mathematical equations or formulas.

CONTENT FILTERING RULES:
- Focus ONLY on academic and educational material.
- Completely ignore and silently omit any irrelevant, conversational, or non-educational text.
- Do not extract or reference any Personally Identifiable Information (PII).
- If a section contains non-academic slang or inappropriate content, skip that section entirely without generating any placeholders.

Format your response as clean, plain text. A student should be able to study from your output alone.`;
const IMAGE_MIME: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

async function updateDynamo(
  uploadKey: string,
  status: string,
  transcriptKey?: string
) {
  let expr = "SET #s = :s";
  const names: Record<string, string> = { "#s": "status" };
  const values: Record<string, { S: string }> = { ":s": { S: status } };

  if (transcriptKey) {
    expr += ", transcriptKey = :tk";
    values[":tk"] = { S: transcriptKey };
  }

  await dynamo.send(
    new UpdateItemCommand({
      TableName: "lecsum-jobs",
      Key: { uploadKey: { S: uploadKey } },
      UpdateExpression: expr,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}

async function extractWithBedrock(
  fileBytes: Uint8Array,
  ext: string
): Promise<string> {
  const base64 = Buffer.from(fileBytes).toString("base64");
  const isImage = ext in IMAGE_MIME;

  const content = isImage
    ? [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: IMAGE_MIME[ext],
          data: base64,
        },
      },
      { type: "text", text: EXTRACT_PROMPT },
    ]
    : [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: base64,
        },
      },
      { type: "text", text: EXTRACT_PROMPT },
    ];

  const response = await bedrock.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 8192,
        messages: [{ role: "user", content }],
      }),
    })
  );

  const raw = JSON.parse(new TextDecoder().decode(response.body));
  return raw.content[0].text as string;
}

export async function POST(req: NextRequest) {
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
    // 1. Download file from S3
    const obj = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.S3_UPLOAD_BUCKET!,
        Key: uploadKey,
      })
    );
    const fileBytes = await obj.Body!.transformToByteArray();

    // 2. Extract with Claude on Bedrock
    const extractedText = await extractWithBedrock(fileBytes, ext);

    // 3. Save extracted text to S3
    const outKey = uploadKey.replace(/\.[^.]+$/, ".txt");
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_TRANSCRIPTS_BUCKET!,
        Key: outKey,
        Body: extractedText,
        ContentType: "text/plain",
      })
    );

    // 4. Update DynamoDB to done
    await updateDynamo(uploadKey, "done", outKey);

    return NextResponse.json({ success: true, transcriptKey: outKey });
  } catch (err) {
    console.error("Extract error:", err);
    await updateDynamo(uploadKey, "error").catch(() => { });
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}