import { NextRequest, NextResponse } from "next/server";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function GET(req: NextRequest) {
  try {
    const uploadKey = req.nextUrl.searchParams.get("uploadKey");
    if (!uploadKey) return NextResponse.json({ error: "Missing uploadKey" }, { status: 400 });

    const result = await dynamo.send(new GetItemCommand({
      TableName: "lecsum-jobs",
      Key: { uploadKey: { S: uploadKey } },
    }));

    const item = result.Item;
    if (!item) return NextResponse.json({ status: "pending" });

    return NextResponse.json({
      status: item.status?.S,
      jobName: item.jobName?.S,
      transcriptKey: item.transcriptKey?.S,
      fileName: item.fileName?.S,
      createdAt: item.createdAt?.S,
    });
  } catch (err) {
    console.error("job-status error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}