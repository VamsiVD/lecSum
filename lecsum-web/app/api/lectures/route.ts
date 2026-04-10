import { NextResponse } from "next/server";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { auth } from "@clerk/nextjs/server";

const dynamo = new DynamoDBClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await dynamo.send(
      new ScanCommand({
        TableName: "lecsum-jobs",
        FilterExpression: "userId = :uid AND NOT begins_with(uploadKey, :courses)",
        ExpressionAttributeValues: {
          ":uid": { S: userId },
          ":courses": { S: "courses" },
        },
      })
    );

    const lectures = (result.Items ?? [])
      .filter(item => item.uploadKey?.S !== "courses") // exclude courses record
      .map(item => ({
        uploadKey: item.uploadKey?.S ?? "",
        jobName: item.jobName?.S,
        transcriptKey: item.transcriptKey?.S,
        fileName: item.fileName?.S,
        displayName: item.displayName?.S,
        status: item.status?.S ?? "pending",
        createdAt: item.createdAt?.S,
        course: item.course?.S,
        userId: item.userId?.S,
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