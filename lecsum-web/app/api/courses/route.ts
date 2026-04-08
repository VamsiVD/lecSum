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

// Courses are stored as a single DynamoDB item:
// { pk: "courses", data: "[{id,name,color,lectureCount}...]" }
const TABLE = "lecsum-jobs";
const PK = "courses";

export async function GET() {
  try {
    const result = await dynamo.send(
      new GetItemCommand({
        TableName: TABLE,
        Key: { uploadKey: { S: PK } },
      })
    );

    if (!result.Item?.data?.S) {
      return NextResponse.json({ courses: [] });
    }

    const courses = JSON.parse(result.Item.data.S);
    return NextResponse.json({ courses });
  } catch (err) {
    console.error("Courses GET error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { courses } = await req.json();

    await dynamo.send(
      new PutItemCommand({
        TableName: TABLE,
        Item: {
          uploadKey: { S: PK },
          data: { S: JSON.stringify(courses) },
        },
      })
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Courses POST error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}