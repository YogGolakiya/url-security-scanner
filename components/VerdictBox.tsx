"use client";

import { VerdictLevel } from "@/lib/types";

interface VerdictBoxProps {
  verdict: VerdictLevel;
  summary: string;
  url: string;
  aiSource: "gemini" | "heuristic";
}

const VERDICT_STYLES: Record<VerdictLevel, { border: string; text: string; bg: string; label: string }> = {
  Safe:     { border: "border-green-800",  text: "text-green-400",  bg: "bg-green-950/30",  label: "SAFE NODE" },
  Low:      { border: "border-yellow-800", text: "text-yellow-400", bg: "bg-yellow-950/20", label: "LOW RISK DETECTED" },
  Medium:   { border: "border-amber-700",  text: "text-amber-400",  bg: "bg-amber-950/20",  label: "MODERATE THREAT" },
  High:     { border: "border-red-800",    text: "text-red-400",    bg: "bg-red-950/25",    label: "HIGH RISK EVENT" },
  Critical: { border: "border-red-600",    text: "text-red-400",    bg: "bg-red-950/40",    label: "CRITICAL THREAT" },
};

export default function VerdictBox({ verdict, summary, url, aiSource }: VerdictBoxProps) {
  const style = VERDICT_STYLES[verdict] ?? VERDICT_STYLES.Medium;

  return (
    <div className={`border-2 ${style.border} ${style.bg} p-5 w-full`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="font-mono text-xs text-zinc-600 tracking-widest uppercase mb-1">
            ▸ INVESTIGATION VERDICT
          </div>
          <div className={`font-mono text-xl font-bold tracking-wider uppercase ${style.text}`}>
            {style.label}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-xs text-zinc-600 mb-1">Analysis Engine</div>
          <div className="font-mono text-xs text-zinc-400">
            {aiSource === "gemini" ? "▸ GEMINI AI" : "▸ LOCAL HEURISTIC"}
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-700 pt-3 mt-3">
        <div className="font-mono text-xs text-zinc-500 mb-1 tracking-widest">TARGET NODE</div>
        <div className="font-mono text-xs text-zinc-300 break-all mb-3">{url}</div>

        <div className="font-mono text-xs text-zinc-500 mb-1 tracking-widest">THREAT SUMMARY</div>
        <p className="font-mono text-sm text-zinc-300 leading-relaxed">{summary}</p>
      </div>
    </div>
  );
}
