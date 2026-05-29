import { NextRequest, NextResponse } from "next/server";
import {
  DynamoDBClient,
  UpdateItemCommand,
  DeleteItemCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { auth } from "@clerk/nextjs/server";
import { sanitizeDisplayName } from "@/lib/sanitize";

const dynamo = new DynamoDBClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function ownsRecord(uploadKey: string, userId: string): Promise<boolean> {
  const result = await dynamo.send(new GetItemCommand({
    TableName: "lecsum-jobs",
    Key: { uploadKey: { S: uploadKey } },
    ProjectionExpression: "userId",
  }));
  return result.Item?.userId?.S === userId;
}

// PATCH /api/lectures/[uploadKey] — update course assignment or rename
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uploadKey: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { uploadKey } = await params;
  const key = decodeURIComponent(uploadKey);

  if (!await ownsRecord(key, userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { course } = body;
  const displayName = sanitizeDisplayName(body.displayName);

  const updateParts: string[] = [];
  const ExpressionAttributeNames: Record<string, string> = {};
  const ExpressionAttributeValues: Record<string, { S: string }> = {};

  if (course !== undefined) {
    updateParts.push("#c = :c");
    ExpressionAttributeNames["#c"] = "course";
    ExpressionAttributeValues[":c"] = { S: String(course).slice(0, 64) };
  }

  if (displayName !== null) {
    updateParts.push("#dn = :dn");
    ExpressionAttributeNames["#dn"] = "displayName";
    ExpressionAttributeValues[":dn"] = { S: displayName };
  }

  if (updateParts.length === 0) {
    return NextResponse.json({ success: true, note: "No fields to update" });
  }

  try {
    await dynamo.send(
      new UpdateItemCommand({
        TableName: "lecsum-jobs",
        Key: { uploadKey: { S: key } },
        UpdateExpression: "SET " + updateParts.join(", "),
        ExpressionAttributeNames,
        ExpressionAttributeValues,
      })
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/lectures/[uploadKey] — remove from DynamoDB
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ uploadKey: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { uploadKey } = await params;
  const key = decodeURIComponent(uploadKey);

  if (!await ownsRecord(key, userId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await dynamo.send(
      new DeleteItemCommand({
        TableName: "lecsum-jobs",
        Key: { uploadKey: { S: key } },
      })
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
