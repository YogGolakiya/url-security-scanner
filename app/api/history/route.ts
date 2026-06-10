import { NextResponse } from "next/server";

export const runtime = "nodejs";

const EC_ID = process.env.EDGE_CONFIG_ID ?? "";
const WRITE_TOKEN = process.env.EDGE_CONFIG_WRITE_TOKEN ?? "";

export async function GET() {
  try {
    if (!EC_ID || !WRITE_TOKEN) {
      return NextResponse.json({ scans: [] });
    }

    const res = await fetch(
      `https://edge-config.vercel.com/${EC_ID}/item/scans?token=${WRITE_TOKEN}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json({ scans: [] });
    }

    const scans = await res.json();
    return NextResponse.json({ scans: Array.isArray(scans) ? scans : [] });
  } catch {
    return NextResponse.json({ scans: [] });
  }
}
