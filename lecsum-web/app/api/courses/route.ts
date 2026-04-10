import { NextRequest, NextResponse } from "next/server";
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

import { auth } from "@clerk/nextjs/server";

const TABLE = "lecsum-jobs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const PK = `courses:${userId}`;  // ← per-user key

  try {
    const result = await dynamo.send(new GetItemCommand({
      TableName: TABLE,
      Key: { uploadKey: { S: PK } },
    }));
    if (!result.Item?.data?.S) return NextResponse.json({ courses: [] });
    return NextResponse.json({ courses: JSON.parse(result.Item.data.S) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const PK = `courses:${userId}`;  // ← per-user key
  const { courses } = await req.json();

  try {
    await dynamo.send(new PutItemCommand({
      TableName: TABLE,
      Item: {
        uploadKey: { S: PK },
        data: { S: JSON.stringify(courses) },
        userId: { S: userId },
      },
    }));
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}