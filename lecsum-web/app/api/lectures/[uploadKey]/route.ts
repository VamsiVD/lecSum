import { NextRequest, NextResponse } from "next/server";
import {
  DynamoDBClient,
  UpdateItemCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// PATCH /api/lectures/[uploadKey] — update course assignment or rename
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uploadKey: string }> }
) {
  const { uploadKey } = await params;
  const key = decodeURIComponent(uploadKey);
  const { course, displayName } = await req.json();

  // Arrays/Objects to dynamically build our DynamoDB update query
  const updateParts: string[] = [];
  const ExpressionAttributeNames: Record<string, string> = {};
  const ExpressionAttributeValues: Record<string, { S: string }> = {};

  if (course !== undefined) {
    updateParts.push("#c = :c");
    ExpressionAttributeNames["#c"] = "course";
    ExpressionAttributeValues[":c"] = { S: course };
  }

  if (displayName !== undefined) {
    updateParts.push("#dn = :dn");
    ExpressionAttributeNames["#dn"] = "displayName";
    ExpressionAttributeValues[":dn"] = { S: displayName };
  }

  // If nothing was passed to update, just return early
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
  const { uploadKey } = await params;
  const key = decodeURIComponent(uploadKey);

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