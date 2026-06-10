import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import ScanModel from "@/models/Scan";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let dbError: string | null = null;
  let dbConnected = false;
  try {
    const data = await req.json();
    const db = await connectDB();
    dbConnected = !!db;
    if (db) {
      await ScanModel.create({ ...data, createdAt: new Date() });
    }
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
    console.error("[persist] DB write failed:", dbError);
  }
  return NextResponse.json({ ok: true, dbConnected, dbError });
}
