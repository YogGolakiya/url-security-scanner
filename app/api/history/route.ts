import { NextResponse } from "next/server";
import connectDB from "@/utils/db";
import ScanModel from "@/models/Scan";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await connectDB();
    if (!db) {
      return NextResponse.json({ scans: [] });
    }
    const scans = await ScanModel.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("url riskScore verdict createdAt summary")
      .lean();
    return NextResponse.json({ scans });
  } catch (err) {
    console.error("[HISTORY] DB fetch error:", err);
    return NextResponse.json({ scans: [] });
  }
}
