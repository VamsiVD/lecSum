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
    const obj = await s3.send(new GetObjectCommand({
      Bucket: process.env.S3_TRANSCRIPTS_BUCKET!,
      Key: key,
    }));
    const transcript = await obj.Body?.transformToString("utf-8");
    if (!transcript) throw new Error("Empty transcript");

    const prompt = `You are a study assistant. Given this lecture transcript, generate 10 flashcards for studying.

Return a JSON array of exactly 10 objects, each with:
- "term": the concept, term, or question (short, max 10 words)
- "definition": the explanation or answer (1-2 sentences)

Respond ONLY with a valid JSON array, no markdown, no explanation.

Transcript:
${transcript.slice(0, 30000)}`;

    const response = await bedrock.send(new InvokeModelCommand({
      modelId: "us.amazon.nova-pro-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        messages: [{ role: "user", content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens: 2048, temperature: 0.3 },
      }),
    }));

    const raw = JSON.parse(new TextDecoder().decode(response.body));
    const text = raw.output.message.content[0].text;
    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]") + 1;
    const flashcards = JSON.parse(text.slice(jsonStart, jsonEnd));

    return NextResponse.json({ flashcards });

  } catch (err) {
    console.error("Flashcards error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}