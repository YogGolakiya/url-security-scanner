"use client";

import { useState, useRef } from "react";
import { ScanResult } from "@/lib/types";
import ForensicConsole from "@/components/ForensicConsole";
import VerdictBox from "@/components/VerdictBox";
import RiskBar from "@/components/RiskBar";
import EvidenceCards from "@/components/EvidenceCards";
import ThreatIndicators from "@/components/ThreatIndicators";
import HistoryTable from "@/components/HistoryTable";

type Phase = "idle" | "scanning" | "complete" | "aborted";

export default function Home() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [historyTick, setHistoryTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValidUrl = (val: string) => {
    try {
      const u = new URL(val);
      return ["http:", "https:"].includes(u.protocol);
    } catch {
      return false;
    }
  };

  async function handleScan() {
    if (!url.trim()) return;
    if (!isValidUrl(url.trim())) {
      setErrorMsg("Invalid URL — must begin with http:// or https://");
      return;
    }

    setErrorMsg("");
    setPhase("scanning");
    setResult(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data: ScanResult = await res.json();

      if (!res.ok || data.status === "aborted") {
        setPhase("aborted");
        setErrorMsg(data.error ?? "Investigation aborted — unknown error.");
        return;
      }

      setResult(data);
      setPhase("complete");

      // Persist to MongoDB from client — Edge runtime can't await background fetch
      fetch("/api/persist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: data.url,
          riskScore: data.riskScore,
          verdict: data.verdict,
          detectedThreats: data.detectedThreats,
          summary: data.summary,
          sslValid: data.ssl?.valid ?? false,
          sslIssuer: data.ssl?.issuer ?? "Unknown",
          sslExpiry: data.ssl?.expiry ?? "Unknown",
          domainAge: data.domain?.age ?? "Unknown",
          registrar: data.domain?.registrar ?? "Unknown",
        }),
      }).then(() => setHistoryTick((t) => t + 1)).catch(() => setHistoryTick((t) => t + 1));

    } catch {
      setPhase("aborted");
      setErrorMsg("Network failure — could not reach analysis engine.");
    }
  }

  function handleReset() {
    setPhase("idle");
    setResult(null);
    setErrorMsg("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  return (
    <main className="min-h-screen bg-[#0F1115] text-zinc-100 font-mono">
      {/* Header Bar */}
      <div className="border-b border-zinc-800 bg-[#0a0c0f] px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-600 animate-pulse" />
            <span className="text-xs text-zinc-500 tracking-widest uppercase">System Online</span>
          </div>
          <div className="text-center">
            <div className="text-xs text-zinc-600 tracking-[0.3em] uppercase">Digital Forensics Division</div>
            <div className="text-zinc-300 font-bold tracking-widest text-sm uppercase">
              URL Threat Intelligence Platform
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-600">v2.1.0 — CLASSIFIED</div>
            <div className="text-xs text-zinc-700">Node: US-EAST-1</div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* === TARGET INGESTION === */}
        <section>
          <div className="border-b border-zinc-800 pb-4 mb-6">
            <div className="text-xs text-zinc-600 tracking-[0.4em] uppercase mb-1">
              ╔═ OPERATION BRIEFING ══════════════════════════════════════════
            </div>
            <h1 className="text-2xl font-bold tracking-wider text-zinc-100 uppercase">
              Target Ingestion
            </h1>
            <p className="text-zinc-500 text-xs mt-1 tracking-wide">
              Submit a URL for full-spectrum forensic analysis. All evidence is logged to the audit ledger.
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-xs text-zinc-600 tracking-widest uppercase">
              ▸ Enter Target URL
            </div>

            <div className="flex gap-0">
              <div className="border border-zinc-700 border-r-0 px-3 py-3 bg-[#0a0c0f] flex items-center">
                <span className="text-zinc-600 text-xs tracking-widest">TARGET://</span>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (errorMsg) setErrorMsg("");
                }}
                onKeyDown={(e) => e.key === "Enter" && phase !== "scanning" && handleScan()}
                placeholder="https://example.com"
                disabled={phase === "scanning"}
                className="flex-1 bg-[#0d1014] border border-zinc-700 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700
                           focus:outline-none focus:border-zinc-500 font-mono tracking-wide
                           disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {errorMsg && (
              <div className="font-mono text-xs text-red-500 flex gap-2">
                <span>✗</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex gap-4 items-center">
              <button
                onClick={handleScan}
                disabled={phase === "scanning" || !url.trim()}
                className="border border-zinc-500 bg-zinc-800/50 hover:bg-zinc-700/60 hover:border-zinc-400
                           disabled:opacity-40 disabled:cursor-not-allowed
                           px-6 py-2.5 text-xs text-zinc-200 font-bold tracking-[0.25em] uppercase
                           transition-colors duration-150"
              >
                [ EXECUTE INVESTIGATION ]
              </button>

              {phase !== "idle" && (
                <button
                  onClick={handleReset}
                  className="border border-zinc-800 hover:border-zinc-700 px-4 py-2.5 text-xs
                             text-zinc-600 hover:text-zinc-400 tracking-widest uppercase transition-colors"
                >
                  [ RESET ]
                </button>
              )}
            </div>
          </div>
        </section>

        {/* === FORENSIC CONSOLE (loading) === */}
        {phase === "scanning" && <ForensicConsole />}

        {/* === ABORTED === */}
        {phase === "aborted" && (
          <section className="border border-red-900 bg-red-950/20 p-6">
            <div className="font-mono text-xs text-zinc-600 mb-2 tracking-widest">
              ╔═ INVESTIGATION STATUS ══════════════════════════════
            </div>
            <div className="font-mono text-lg font-bold text-red-500 mb-3 tracking-wider uppercase">
              [ INVESTIGATION ABORTED ]
            </div>
            <div className="space-y-1">
              <div className="font-mono text-xs text-zinc-500">▸ DIAGNOSTIC OUTPUT:</div>
              <div className="font-mono text-sm text-zinc-400 pl-4">{errorMsg}</div>
            </div>
            <div className="mt-4 border-t border-zinc-800 pt-3">
              <div className="font-mono text-xs text-zinc-700">
                Investigation halted. Check target URL validity or system API configuration.
              </div>
            </div>
          </section>
        )}

        {/* === EVIDENCE DOSSIER === */}
        {phase === "complete" && result && (
          <section className="space-y-6">
            <div className="border-b border-zinc-800 pb-3">
              <div className="text-xs text-zinc-600 tracking-[0.4em] uppercase mb-1">
                ╔═ EVIDENCE DOSSIER ════════════════════════════════════════════
              </div>
              <div className="text-lg font-bold tracking-wider text-zinc-100 uppercase">
                Threat Intelligence Report
              </div>
            </div>

            {/* Verdict */}
            <VerdictBox
              verdict={result.verdict}
              summary={result.summary}
              url={result.url}
              aiSource={result.aiSource}
            />

            {/* Risk Bar */}
            <div className="border border-zinc-700 bg-[#0d0f12] p-5">
              <RiskBar score={result.riskScore} />
            </div>

            {/* Evidence Cards */}
            <EvidenceCards result={result} />

            {/* Threat Indicators */}
            <ThreatIndicators threats={result.detectedThreats} />
          </section>
        )}

        {/* === INCIDENT AUDIT TRAIL === */}
        <section>
          <div className="border-b border-zinc-800 pb-3 mb-4">
            <div className="text-xs text-zinc-600 tracking-[0.4em] uppercase mb-1">
              ╔═ SYSTEM LOG ══════════════════════════════════════════════════
            </div>
            <div className="text-sm font-bold tracking-wider text-zinc-400 uppercase">
              Past Incident Records
            </div>
          </div>
          <HistoryTable refreshTrigger={historyTick} />
        </section>

      </div>

      {/* Footer */}
      <div className="border-t border-zinc-900 py-4 mt-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <span className="font-mono text-xs text-zinc-800">CLASSIFIED — INTERNAL USE ONLY</span>
          <span className="font-mono text-xs text-zinc-800">
            URL Threat Intelligence Platform — Digital Forensics Division
          </span>
        </div>
      </div>
    </main>
  );
}
