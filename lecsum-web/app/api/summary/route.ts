import { NextRequest, NextResponse } from "next/server";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

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

  try {
    // 1. Read transcript from S3
    const obj = await s3.send(new GetObjectCommand({
      Bucket: process.env.S3_TRANSCRIPTS_BUCKET!,
      Key: key,
    }));
    const transcript = await obj.Body?.transformToString("utf-8");
    if (!transcript) throw new Error("Empty transcript");

    // 2. Call Bedrock
    const prompt = `You are a study assistant. Given this lecture transcript, return a JSON object with exactly these fields:
- "tldr": one sentence summary (max 30 words)
- "key_concepts": array of 4-6 important concepts (strings)
- "summary": 2-3 paragraphs explaining the main content
- "topics": array of 3-5 short topic tags

Respond ONLY with valid JSON, no markdown, no explanation.

Transcript:
${transcript.slice(0, 30000)}`;

    const response = await bedrock.send(new InvokeModelCommand({
      modelId: "us.amazon.nova-pro-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        messages: [{ role: "user", content: [{ text: prompt }] }],
        inferenceConfig: {
          maxTokens: 1024,
          temperature: 0.3,
        },
      }),
    }));

    const raw = JSON.parse(new TextDecoder().decode(response.body));
    console.log("Raw Bedrock response:", JSON.stringify(raw, null, 2));
    const summary = JSON.parse(raw.output.message.content[0].text);

    return NextResponse.json(summary);

  } catch (err) {
    console.error("Summary error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}