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

// Used for PDF / image — Claude sees raw bytes
const EXTRACT_PROMPT = `You are extracting content from a document page for a student study assistant.

Extract ALL of the following:
1. Every word of text, preserving headings and structure
2. Describe any diagrams, charts, graphs, or figures in detail
3. Describe any tables — include all cell values
4. Note any mathematical equations or formulas

Format your response as plain text. For diagrams write [DIAGRAM: description]. For tables write [TABLE: description].
Be thorough — a student should be able to study from your output alone without seeing the original.`;

// Used for DOCX / PPTX — we supply pre-extracted text, Claude cleans it up
const refinePrompt = (fileType: string) =>
  `You are a student study assistant. The following raw text was extracted from a ${fileType.toUpperCase()} file.

Please:
1. Clean up any garbled characters or formatting artifacts
2. Preserve all headings, titles, and structure
3. Mark any tables with [TABLE: description of table contents]
4. Mark any figure/diagram references with [DIAGRAM: description]
5. Format the result as clear, readable study material

Be thorough — a student should be able to study from your output alone.

Extracted text:
`;

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

async function extractDocx(buf: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: buf });
  return result.value;
}

async function extractPptx(buf: Buffer): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);

  const slideFiles = Object.keys(zip.files)
    .filter(f => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/(\d+)\.xml$/)?.[1] ?? "0");
      const nb = parseInt(b.match(/(\d+)\.xml$/)?.[1] ?? "0");
      return na - nb;
    });

  const slides: string[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async("text");
    const texts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)]
      .map(m => m[1].trim())
      .filter(Boolean);
    if (texts.length > 0) {
      slides.push(`[Slide ${i + 1}]\n${texts.join(" ")}`);
    }
  }

  return slides.join("\n\n");
}

// Magic-byte signatures for each allowed type
const MAGIC: Record<string, (b: Uint8Array) => boolean> = {
  pdf:  b => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46, // %PDF
  docx: b => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04, // PK (ZIP)
  pptx: b => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04, // PK (ZIP)
  jpg:  b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  jpeg: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png:  b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
};

function validateMagicBytes(buf: Uint8Array, ext: string): boolean {
  const check = MAGIC[ext];
  if (!check) return true; // no signature defined — allow through
  return check(buf);
}

async function refineWithClaude(rawText: string, fileType: string): Promise<string> {
  const response = await bedrock.send(new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 8192,
      messages: [{ role: "user", content: [{ type: "text", text: refinePrompt(fileType) + rawText }] }],
    }),
  }));
  const raw = JSON.parse(new TextDecoder().decode(response.body));
  return raw.content[0].text;
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
  const supported = new Set(["pdf", "jpg", "jpeg", "png", "docx", "pptx"]);

  if (!supported.has(ext)) {
    return NextResponse.json(
      { error: `${ext.toUpperCase()} not supported.` },
      { status: 400 }
    );
  }

  try {
    const obj = await s3.send(new GetObjectCommand({
      Bucket: process.env.S3_UPLOAD_BUCKET!,
      Key: uploadKey,
    }));
    const fileBytes = await obj.Body!.transformToByteArray();
    const buf = Buffer.from(fileBytes);

    if (!validateMagicBytes(fileBytes, ext)) {
      await updateDynamo(uploadKey, userId, "error").catch(() => { });
      return NextResponse.json(
        { error: "File content does not match its extension." },
        { status: 415 }
      );
    }

    let extractedText: string;

    if (ext === "docx") {
      const rawText = await extractDocx(buf);
      extractedText = await refineWithClaude(rawText, "docx");
    } else if (ext === "pptx") {
      const rawText = await extractPptx(buf);
      extractedText = await refineWithClaude(rawText, "pptx");
    } else {
      // PDF / image — send raw bytes to Claude
      const isImage = ext in IMAGE_MIME;
      const base64 = buf.toString("base64");

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
      extractedText = raw.content[0].text;
    }

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
