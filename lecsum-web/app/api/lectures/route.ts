import { NextResponse } from "next/server";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET() {
  try {
    const result = await dynamo.send(
      new ScanCommand({ TableName: "lecsum-jobs" })
    );

    const lectures = (result.Items ?? [])
      // 1. Filter out the global courses record so it doesn't show up in the UI
      .filter((item) => item.uploadKey?.S !== "courses")
      .map((item) => ({
        uploadKey: item.uploadKey?.S ?? "",
        jobName: item.jobName?.S,
        transcriptKey: item.transcriptKey?.S,
        fileName: item.fileName?.S,
        // 2. Added displayName so your frontend gets the renamed values!
        displayName: item.displayName?.S,
        status: item.status?.S ?? "pending",
        createdAt: item.createdAt?.S,
        course: item.course?.S,
      }))
      .sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    return NextResponse.json({ lectures });
  } catch (err) {
    console.error("Lectures fetch error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}