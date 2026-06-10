"use client";

import { useEffect, useState } from "react";
import { HistoryScan, VerdictLevel } from "@/lib/types";

const VERDICT_COLOR: Record<VerdictLevel, string> = {
  Safe:     "text-green-500",
  Low:      "text-yellow-500",
  Medium:   "text-amber-500",
  High:     "text-red-400",
  Critical: "text-red-500",
};

interface Props {
  refreshTrigger: number;
}

export default function HistoryTable({ refreshTrigger }: Props) {
  const [scans, setScans] = useState<HistoryScan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/history")
      .then((r) => r.json())
      .then((data) => {
        setScans(data.scans ?? []);
      })
      .catch(() => setScans([]))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  return (
    <div className="w-full border border-zinc-700 bg-[#0a0c0f]">
      <div className="border-b border-zinc-800 p-3">
        <span className="font-mono text-xs text-zinc-500 tracking-widest uppercase">
          ┌─ Incident Audit Trail — Last 5 Scans
        </span>
      </div>

      {loading ? (
        <div className="p-4 font-mono text-xs text-zinc-600 animate-pulse">
          [ QUERYING ] Fetching audit ledger...
        </div>
      ) : scans.length === 0 ? (
        <div className="p-4 font-mono text-xs text-zinc-700">
          [ EMPTY ] No prior incidents logged in this session.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="font-mono text-xs text-zinc-600 text-left p-2 tracking-widest uppercase">Target URL</th>
                <th className="font-mono text-xs text-zinc-600 text-left p-2 tracking-widest uppercase">Verdict</th>
                <th className="font-mono text-xs text-zinc-600 text-left p-2 tracking-widest uppercase">Score</th>
                <th className="font-mono text-xs text-zinc-600 text-left p-2 tracking-widest uppercase">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <tr key={scan._id} className="border-b border-zinc-800/50 hover:bg-zinc-900/40 transition-colors">
                  <td className="font-mono text-xs text-zinc-400 p-2 max-w-xs truncate">
                    {scan.url}
                  </td>
                  <td className={`font-mono text-xs font-bold p-2 ${VERDICT_COLOR[scan.verdict]}`}>
                    {scan.verdict.toUpperCase()}
                  </td>
                  <td className="font-mono text-xs p-2">
                    <span className={`${
                      scan.riskScore >= 75 ? "text-red-500" :
                      scan.riskScore >= 50 ? "text-amber-500" :
                      scan.riskScore >= 25 ? "text-yellow-500" :
                      "text-green-500"
                    }`}>{scan.riskScore}/100</span>
                  </td>
                  <td className="font-mono text-xs text-zinc-600 p-2">
                    {new Date(scan.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
