import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EC_ID = process.env.EDGE_CONFIG_ID ?? "";
const WRITE_TOKEN = process.env.EDGE_CONFIG_WRITE_TOKEN ?? "";
const VERCEL_TOKEN = process.env.VERCEL_TOKEN_FOR_EC ?? WRITE_TOKEN;

interface ScanRecord {
  url: string;
  riskScore: number;
  verdict: string;
  detectedThreats: string[];
  summary: string;
  sslValid: boolean;
  sslIssuer: string;
  sslExpiry: string;
  domainAge: string;
  registrar: string;
  createdAt: string;
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    if (!EC_ID || !WRITE_TOKEN) {
      console.warn("[persist] Edge Config not configured");
      return NextResponse.json({ ok: true });
    }

    // Read current scans
    const readRes = await fetch(
      `https://edge-config.vercel.com/${EC_ID}/item/scans?token=${WRITE_TOKEN}`,
      { cache: "no-store" }
    );
    let scans: ScanRecord[] = [];
    if (readRes.ok) {
      try {
        scans = await readRes.json();
      } catch {}
    }
    if (!Array.isArray(scans)) scans = [];

    // Prepend new scan, keep last 5
    const newRecord: ScanRecord = {
      url: data.url ?? "",
      riskScore: data.riskScore ?? 0,
      verdict: data.verdict ?? "Unknown",
      detectedThreats: data.detectedThreats ?? [],
      summary: data.summary ?? "",
      sslValid: data.sslValid ?? false,
      sslIssuer: data.sslIssuer ?? "Unknown",
      sslExpiry: data.sslExpiry ?? "Unknown",
      domainAge: data.domainAge ?? "Unknown",
      registrar: data.registrar ?? "Unknown",
      createdAt: new Date().toISOString(),
    };
    scans = [newRecord, ...scans].slice(0, 5);

    // Write back via Edge Config API
    const writeRes = await fetch(
      `https://api.vercel.com/v1/edge-config/${EC_ID}/items`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${WRITE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [{ operation: "upsert", key: "scans", value: scans }],
        }),
      }
    );

    if (!writeRes.ok) {
      const errText = await writeRes.text();
      console.error("[persist] Edge Config write failed:", errText);
    }
  } catch (err) {
    console.error("[persist] error:", err instanceof Error ? err.message : err);
  }

  return NextResponse.json({ ok: true });
}
