import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { auth } from "@clerk/nextjs/server";

const dynamo = new DynamoDBClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(req: NextRequest) {
  const uploadKey = req.nextUrl.searchParams.get("uploadKey");
  const course = req.nextUrl.searchParams.get("course");

  if (!uploadKey) {
    return NextResponse.json({ error: "Missing uploadKey" }, { status: 400 });
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // write userId + course on first poll (non-blocking)
    const updates: string[] = ["userId = :uid"];
    const values: Record<string, { S: string }> = { ":uid": { S: userId } };

    if (course) {
      updates.push("course = :c");
      values[":c"] = { S: course };
    }

    await dynamo.send(new UpdateItemCommand({
      TableName: "lecsum-jobs",
      Key: { uploadKey: { S: uploadKey } },
      UpdateExpression: `SET ${updates.join(", ")}`,
      ExpressionAttributeValues: values,
      // only update if item exists
      ConditionExpression: "attribute_exists(uploadKey)",
    })).catch(() => { }); // non-blocking — ignore if item doesn't exist yet

    const result = await dynamo.send(new GetItemCommand({
      TableName: "lecsum-jobs",
      Key: { uploadKey: { S: uploadKey } },
    }));

    const item = result.Item;
    if (!item) {
      return NextResponse.json({ status: "pending" });
    }

    return NextResponse.json({
      status: item.status?.S,
      jobName: item.jobName?.S,
      transcriptKey: item.transcriptKey?.S,
      fileName: item.fileName?.S,
      createdAt: item.createdAt?.S,
      course: item.course?.S,
    });
  } catch (err) {
    console.error("job-status error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}