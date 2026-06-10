import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/utils/apiHandler";
import { runHeuristics } from "@/lib/heuristics";
import { checkSSL } from "@/lib/sslCheck";
import { lookupDomain } from "@/lib/domainLookup";
import { synthesizeWithAI, localFallback } from "@/lib/aiSynthesis";
import connectDB from "@/utils/db";
import ScanModel from "@/models/Scan";

export const runtime = "nodejs";
export const maxDuration = 25;

// Hard deadline — ensures we never exceed Vercel's free-tier 10s wall
const SCAN_DEADLINE_MS = 8500;

export const POST = withErrorHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!url) {
    return NextResponse.json({ error: "No URL provided.", status: "aborted" }, { status: 400 });
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Only HTTP/HTTPS URLs are supported.", status: "aborted" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Malformed URL — cannot parse target.", status: "aborted" }, { status: 400 });
  }

  // Run all forensic steps + AI concurrently under a hard deadline
  const heuristics = runHeuristics(url);

  const scanWithDeadline = Promise.race([
    // Full scan path
    (async () => {
      const [sslResult, domainResult] = await Promise.allSettled([
        checkSSL(url),
        lookupDomain(url),
      ]);

      const ssl = sslResult.status === "fulfilled"
        ? sslResult.value
        : { valid: false, issuer: "Timeout", expiry: "Unknown", daysUntilExpiry: -1 };

      const domain = domainResult.status === "fulfilled"
        ? domainResult.value
        : { domainAge: "Unknown", registrar: "Unknown", createdDate: "Unknown" };

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

      return { ssl, domain, analysis };
    })(),

    // Deadline fallback — returns heuristic-only result if slow
    new Promise<{ ssl: { valid: boolean; issuer: string; expiry: string; daysUntilExpiry: number }; domain: { domainAge: string; registrar: string; createdDate: string }; analysis: ReturnType<typeof localFallback> }>((resolve) =>
      setTimeout(() => resolve({
        ssl: { valid: false, issuer: "Timeout", expiry: "Unknown", daysUntilExpiry: -1 },
        domain: { domainAge: "Unknown", registrar: "Unknown", createdDate: "Unknown" },
        analysis: localFallback({ url, heuristicThreats: heuristics.threats, heuristicScore: heuristics.baseScore, sslValid: false, sslIssuer: "Timeout", sslExpiry: "Unknown", domainAge: "Unknown", registrar: "Unknown" }),
      }), SCAN_DEADLINE_MS)
    ),
  ]);

  const { ssl, domain, analysis } = await scanWithDeadline;

  // Persist to MongoDB asynchronously — never block the response
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

  connectDB().then((db) => {
    if (db) ScanModel.create(dossier).catch(() => {});
  }).catch(() => {});

  return NextResponse.json({
    status: "complete",
    url,
    verdict: analysis.verdict,
    riskScore: analysis.riskScore,
    summary: analysis.summary,
    detectedThreats: heuristics.threats,
    ssl: { valid: ssl.valid, issuer: ssl.issuer, expiry: ssl.expiry, daysUntilExpiry: ssl.daysUntilExpiry },
    domain: { age: domain.domainAge, registrar: domain.registrar, createdDate: domain.createdDate },
    aiSource: analysis.source,
  });
});
