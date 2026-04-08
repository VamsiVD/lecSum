import { NextRequest, NextResponse } from "next/server";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

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

const MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0";

async function getFromS3(key: string): Promise<string | null> {
  try {
    const obj = await s3.send(new GetObjectCommand({
      Bucket: process.env.S3_TRANSCRIPTS_BUCKET!,
      Key: key,
    }));
    return await obj.Body!.transformToString("utf-8");
  } catch {
    return null;
  }
}

async function saveToS3(key: string, data: unknown): Promise<void> {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_TRANSCRIPTS_BUCKET!,
    Key: key,
    Body: JSON.stringify(data),
    ContentType: "application/json",
  }));
}

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  try {
    // 1. Check cache
    const cacheKey = key.replace(/\.txt$/, ".quiz.json");
    const cached = await getFromS3(cacheKey);
    if (cached) {
      console.log(`Cache hit: ${cacheKey}`);
      return NextResponse.json(JSON.parse(cached));
    }

    // 2. Cache miss — fetch transcript
    const transcript = await getFromS3(key);
    if (!transcript) throw new Error("Empty transcript");

    // 3. Generate with Bedrock (your existing code unchanged)
    const response = await bedrock.send(new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2048,
        system: "You are an academic study assistant that helps university students prepare for exams. You generate multiple choice comprehension questions in JSON format based on course material.",
        messages: [{
          role: "user",
          content: `Generate 6 multiple choice comprehension questions based on this university lecture.

Return a JSON array of exactly 6 objects, each with:
- "question": the question string
- "options": array of exactly 4 answer strings
- "correct": index (0-3) of the correct answer
- "explanation": one sentence explaining why the answer is correct

Respond ONLY with a valid JSON array, no markdown, no explanation.

Lecture content:
${transcript.slice(0, 30000)}`
        }],
      }),
    }));

    const raw = JSON.parse(new TextDecoder().decode(response.body));
    const text = raw.content[0].text;
    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]") + 1;
    const questions = JSON.parse(text.slice(jsonStart, jsonEnd));

    // 4. Save to cache
    await saveToS3(cacheKey, { questions });
    console.log(`Cache saved: ${cacheKey}`);

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("Quiz error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}