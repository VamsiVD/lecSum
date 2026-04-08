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

// PATCH /api/lectures/[uploadKey] — update course assignment
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uploadKey: string }> }
) {
  const { uploadKey } = await params;
  const key = decodeURIComponent(uploadKey);
  const { course } = await req.json();

  try {
    await dynamo.send(
      new UpdateItemCommand({
        TableName: "lecsum-jobs",
        Key: { uploadKey: { S: key } },
        UpdateExpression: "SET course = :c",
        ExpressionAttributeValues: { ":c": { S: course ?? "" } },
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