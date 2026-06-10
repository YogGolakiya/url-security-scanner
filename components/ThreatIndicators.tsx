"use client";

interface Props {
  threats: string[];
}

export default function ThreatIndicators({ threats }: Props) {
  if (threats.length === 0) {
    return (
      <div className="border border-zinc-800 bg-[#0d0f12] p-4 w-full">
        <div className="font-mono text-xs text-zinc-500 tracking-widest uppercase border-b border-zinc-800 pb-2 mb-3">
          ┌─ Flagged Heuristic Indicators
        </div>
        <div className="font-mono text-xs text-green-600 flex items-center gap-2">
          <span>✓</span>
          <span>No structural anomalies detected in target URL.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-zinc-700 bg-[#0d0f12] p-4 w-full">
      <div className="font-mono text-xs text-zinc-500 tracking-widest uppercase border-b border-zinc-800 pb-2 mb-3">
        ┌─ Flagged Heuristic Indicators ({threats.length} signal{threats.length !== 1 ? "s" : ""} detected)
      </div>
      <div className="space-y-2">
        {threats.map((threat, i) => (
          <div key={i} className="flex gap-3 items-start font-mono text-xs">
            <span className="text-red-600 shrink-0 mt-0.5">▸</span>
            <span className="text-zinc-300">{threat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
