import { NextRequest, NextResponse } from "next/server";
import { runHeuristics } from "@/lib/heuristics";
import { checkSSL } from "@/lib/sslCheck";
import { lookupDomain } from "@/lib/domainLookup";
import { synthesizeWithAI, localFallback } from "@/lib/aiSynthesis";

// Edge runtime: no cold start, 25s CPU limit (vs 10s for Node.js on Hobby plan)
export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
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

    // Run synchronous heuristics immediately
    const heuristics = runHeuristics(url);

    // Race all I/O against a 7s deadline
    const ioResult = await Promise.race([
      Promise.allSettled([checkSSL(url), lookupDomain(url)]),
      new Promise<PromiseSettledResult<never>[]>((resolve) =>
        setTimeout(() => resolve([
          { status: "rejected", reason: "timeout" },
          { status: "rejected", reason: "timeout" },
        ]), 7000)
      ),
    ]);

    const ssl = ioResult[0].status === "fulfilled"
      ? ioResult[0].value
      : { valid: false, issuer: "Timeout", expiry: "Unknown", daysUntilExpiry: -1 };

    const domain = ioResult[1].status === "fulfilled"
      ? ioResult[1].value
      : { domainAge: "Unknown", registrar: "Unknown", createdDate: "Unknown" };

    // AI synthesis with fallback
    const analysis = await synthesizeWithAI({
      url,
      heuristicThreats: heuristics.threats,
      heuristicScore: heuristics.baseScore,
      sslValid: ssl.valid,
      sslIssuer: ssl.issuer,
      sslExpiry: ssl.expiry,
      domainAge: domain.domainAge,
      registrar: domain.registrar,
    }).catch(() => localFallback({
      url,
      heuristicThreats: heuristics.threats,
      heuristicScore: heuristics.baseScore,
      sslValid: ssl.valid,
      sslIssuer: ssl.issuer,
      sslExpiry: ssl.expiry,
      domainAge: domain.domainAge,
      registrar: domain.registrar,
    }));

    // Persist to DB asynchronously via separate API call (edge can't use mongoose)
    fetch(new URL("/api/persist", req.url).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url, riskScore: analysis.riskScore, verdict: analysis.verdict,
        detectedThreats: heuristics.threats, summary: analysis.summary,
        sslValid: ssl.valid, sslIssuer: ssl.issuer, sslExpiry: ssl.expiry,
        domainAge: domain.domainAge, registrar: domain.registrar,
      }),
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

  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message, status: "aborted" }, { status: 500 });
  }
}
