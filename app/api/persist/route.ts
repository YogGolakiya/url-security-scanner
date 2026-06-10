import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/utils/db";
import ScanModel from "@/models/Scan";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const db = await connectDB();
    if (db) await ScanModel.create({ ...data, createdAt: new Date() });
  } catch {
    // Silently fail — this is a background fire-and-forget
  }
  return NextResponse.json({ ok: true });
}
