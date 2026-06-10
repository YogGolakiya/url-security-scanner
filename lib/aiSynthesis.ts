import { GoogleGenerativeAI } from "@google/generative-ai";

export type VerdictLevel = "Safe" | "Low" | "Medium" | "High" | "Critical";

export interface AIAnalysis {
  verdict: VerdictLevel;
  riskScore: number;
  summary: string;
  source: "gemini" | "heuristic";
}

interface SynthesisInput {
  url: string;
  heuristicThreats: string[];
  heuristicScore: number;
  sslValid: boolean;
  sslIssuer: string;
  sslExpiry: string;
  domainAge: string;
  registrar: string;
}

export async function synthesizeWithAI(input: SynthesisInput): Promise<AIAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const result = await callGemini(input, apiKey);
      return result;
    } catch (e) {
      console.warn("[AI] Gemini call failed, falling back to heuristic engine:", e);
    }
  }

  return localFallback(input);
}

async function callGemini(input: SynthesisInput, apiKey: string): Promise<AIAnalysis> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a cybersecurity threat intelligence analyst. Analyze the following URL forensic data and return ONLY a raw JSON object — no markdown, no code blocks, no explanation.

TARGET URL: ${input.url}

FORENSIC DATA:
- Heuristic threats detected: ${input.heuristicThreats.join(" | ") || "None"}
- Heuristic risk score: ${input.heuristicScore}/100
- SSL valid: ${input.sslValid}
- SSL issuer: ${input.sslIssuer}
- SSL expiry: ${input.sslExpiry}
- Domain age: ${input.domainAge}
- Registrar: ${input.registrar}

Return ONLY this exact JSON structure:
{
  "verdict": "<one of: Safe|Low|Medium|High|Critical>",
  "riskScore": <integer 0-100>,
  "summary": "<exactly 2 sentences, non-technical, describing the specific threat vector and recommended action>"
}`;

  // Race with 8s timeout to stay within Vercel free-tier function limit
  const response = await Promise.race([
    model.generateContent(prompt),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error("Gemini timeout")), 6000)),
  ]);
  const text = response.response.text().trim();

  // Strip markdown code blocks if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  const parsed = JSON.parse(cleaned) as { verdict: string; riskScore: number; summary: string };

  const validVerdicts: VerdictLevel[] = ["Safe", "Low", "Medium", "High", "Critical"];
  const verdict = validVerdicts.includes(parsed.verdict as VerdictLevel)
    ? (parsed.verdict as VerdictLevel)
    : "Medium";

  return {
    verdict,
    riskScore: Math.min(100, Math.max(0, Math.round(parsed.riskScore))),
    summary: parsed.summary ?? "Analysis complete.",
    source: "gemini",
  };
}

export function localFallback(input: SynthesisInput): AIAnalysis {
  let score = input.heuristicScore;

  if (!input.sslValid) score += 15;
  if (input.domainAge.includes("NEWLY REGISTERED")) score += 20;
  if (input.registrar === "Unknown") score += 5;

  score = Math.min(100, score);

  const verdict: VerdictLevel =
    score >= 80 ? "Critical" :
    score >= 60 ? "High" :
    score >= 40 ? "Medium" :
    score >= 20 ? "Low" : "Safe";

  const summaryMap: Record<VerdictLevel, string> = {
    Critical: "This URL displays multiple high-confidence indicators of active malicious infrastructure, including phishing keyword patterns, invalid SSL, and suspicious domain registration. Immediate avoidance is strongly advised — do not interact with this target.",
    High: "Significant structural anomalies were detected suggesting this URL may be part of a credential harvesting or redirect-chain attack. Exercise extreme caution and verify through official channels before proceeding.",
    Medium: "Moderate risk indicators were identified in this URL's structure and registration data. Proceed with caution and avoid entering personal or sensitive information on this target.",
    Low: "Minor heuristic flags were detected but overall structural integrity appears acceptable. Standard safe browsing practices are recommended.",
    Safe: "No significant threat indicators were detected in this URL. The domain infrastructure, SSL certificate, and structural patterns align with legitimate web presence.",
  };

  return {
    verdict,
    riskScore: score,
    summary: summaryMap[verdict],
    source: "heuristic",
  };
}
