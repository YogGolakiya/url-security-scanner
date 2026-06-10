import { NextResponse } from "next/server";

export const runtime = "nodejs";

const EC_ID = process.env.EDGE_CONFIG_ID ?? "";
const WRITE_TOKEN = process.env.EDGE_CONFIG_WRITE_TOKEN ?? "";

export async function GET() {
  const EC_ID_USED = EC_ID;
  const TOKEN_USED = WRITE_TOKEN ? WRITE_TOKEN.slice(0, 8) + "..." : "(missing)";

  try {
    if (!EC_ID || !WRITE_TOKEN) {
      return NextResponse.json({ scans: [], debug: `missing vars: EC_ID=${!!EC_ID} TOKEN=${!!WRITE_TOKEN}` });
    }

    const url = `https://edge-config.vercel.com/${EC_ID}/item/scans?token=${WRITE_TOKEN}`;
    const res = await fetch(url, { cache: "no-store" });
    const body = await res.text();

    if (!res.ok) {
      return NextResponse.json({ scans: [], debug: `fetch failed ${res.status}: ${body.slice(0,100)}`, ec_id: EC_ID_USED, token: TOKEN_USED });
    }

    const scans = JSON.parse(body);
    return NextResponse.json({ scans: Array.isArray(scans) ? scans : [], debug: "ok", count: Array.isArray(scans) ? scans.length : 0 });
  } catch (err) {
    return NextResponse.json({ scans: [], debug: String(err), ec_id: EC_ID_USED, token: TOKEN_USED });
  }
}
