"use client";

import { useEffect, useState } from "react";

const LOG_STEPS = [
  { delay: 0,    text: "[ INIT ] Target ingestion protocol initiated..." },
  { delay: 600,  text: "[ CONNECTING ] Establishing secure handshake with target routing node..." },
  { delay: 1400, text: "[ HEURISTIC ] Running structural anomaly detection pass..." },
  { delay: 2200, text: "[ RESOLVING ] Extracting cryptographic SSL/TLS certificate metadata..." },
  { delay: 3200, text: "[ LOOKUP ] Querying global domain registers for origin lineage..." },
  { delay: 4400, text: "[ AI SYNTHESIS ] Compiling behavioral telemetry via AI Threat Engine..." },
  { delay: 5600, text: "[ PERSIST ] Writing evidence dossier to audit ledger..." },
];

export default function ForensicConsole() {
  const [visibleLogs, setVisibleLogs] = useState<string[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    setVisibleLogs([]);

    LOG_STEPS.forEach(({ delay, text }) => {
      const t = setTimeout(() => {
        setVisibleLogs((prev) => [...prev, text]);
      }, delay);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="w-full border border-zinc-700 bg-[#0a0c0f] p-4 mt-6">
      <div className="text-zinc-500 text-xs font-mono mb-3 border-b border-zinc-800 pb-2">
        ┌─ FORENSIC LOG CONSOLE ─────────────────────────────────────────────────┐
      </div>
      <div className="space-y-1 min-h-[160px]">
        {visibleLogs.map((log, i) => (
          <div
            key={i}
            className="font-mono text-xs text-zinc-400 flex gap-2 items-start animate-fade-in"
          >
            <span className="text-zinc-600 select-none">›</span>
            <span>{log}</span>
          </div>
        ))}
        {visibleLogs.length < LOG_STEPS.length && (
          <div className="font-mono text-xs text-amber-500 flex gap-2 items-center mt-1">
            <span className="animate-pulse">█</span>
            <span className="text-zinc-600">awaiting system response...</span>
          </div>
        )}
      </div>
      <div className="text-zinc-700 text-xs font-mono mt-3 border-t border-zinc-800 pt-2">
        └───────────────────────────────────────────────────────────────────────────┘
      </div>
    </div>
  );
}
