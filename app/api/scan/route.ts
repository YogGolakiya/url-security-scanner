import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/utils/apiHandler";
import { runHeuristics } from "@/lib/heuristics";
import { checkSSL } from "@/lib/sslCheck";
import { lookupDomain } from "@/lib/domainLookup";
import { synthesizeWithAI } from "@/lib/aiSynthesis";
import connectDB from "@/utils/db";
import ScanModel from "@/models/Scan";

export const runtime = "nodejs";
export const maxDuration = 30;

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!url) {
    return NextResponse.json({ error: "No URL provided.", status: "aborted" }, { status: 400 });
  }

  // Validate URL format
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Only HTTP/HTTPS URLs are supported.", status: "aborted" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Malformed URL — cannot parse target.", status: "aborted" }, { status: 400 });
  }

  // Execute all forensic steps concurrently
  const [heuristicResult, sslResult, domainResult] = await Promise.allSettled([
    Promise.resolve(runHeuristics(url)),
    checkSSL(url),
    lookupDomain(url),
  ]);

  const heuristics =
    heuristicResult.status === "fulfilled"
      ? heuristicResult.value
      : { threats: ["[ HEURISTIC ] Analysis engine error."], baseScore: 30 };

  const ssl =
    sslResult.status === "fulfilled"
      ? sslResult.value
      : { valid: false, issuer: "Error", expiry: "Unknown", daysUntilExpiry: -1 };

  const domain =
    domainResult.status === "fulfilled"
      ? domainResult.value
      : { domainAge: "Unknown", registrar: "Unknown", createdDate: "Unknown" };

  // AI synthesis
  const analysis = await synthesizeWithAI({
    url,
    heuristicThreats: heuristics.threats,
    heuristicScore: heuristics.baseScore,
    sslValid: ssl.valid,
    sslIssuer: ssl.issuer,
    sslExpiry: ssl.expiry,
    domainAge: domain.domainAge,
    registrar: domain.registrar,
  });

  // Persist to MongoDB (non-blocking — don't fail scan if DB is unavailable)
  const dossier = {
    url,
    riskScore: analysis.riskScore,
    verdict: analysis.verdict,
    detectedThreats: heuristics.threats,
    summary: analysis.summary,
    sslValid: ssl.valid,
    sslIssuer: ssl.issuer,
    sslExpiry: ssl.expiry,
    domainAge: domain.domainAge,
    registrar: domain.registrar,
    createdAt: new Date(),
  };

  try {
    const db = await connectDB();
    if (db) {
      await ScanModel.create(dossier);
    }
  } catch (dbErr) {
    console.warn("[DB] Persistence failed (scan still returned):", dbErr);
  }

  return NextResponse.json({
    status: "complete",
    url,
    verdict: analysis.verdict,
    riskScore: analysis.riskScore,
    summary: analysis.summary,
    detectedThreats: heuristics.threats,
    ssl: {
      valid: ssl.valid,
      issuer: ssl.issuer,
      expiry: ssl.expiry,
      daysUntilExpiry: ssl.daysUntilExpiry,
    },
    domain: {
      age: domain.domainAge,
      registrar: domain.registrar,
      createdDate: domain.createdDate,
    },
    aiSource: analysis.source,
  });
});
