"use client";

interface RiskBarProps {
  score: number;
}

function getBarColor(score: number): string {
  if (score >= 75) return "bg-red-700";
  if (score >= 50) return "bg-amber-600";
  if (score >= 25) return "bg-yellow-600";
  return "bg-green-700";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  if (score >= 20) return "LOW";
  return "SAFE";
}

export default function RiskBar({ score }: RiskBarProps) {
  const color = getBarColor(score);
  const label = getScoreLabel(score);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="font-mono text-xs text-zinc-500 uppercase tracking-widest">Threat Index</span>
        <span className={`font-mono text-xs font-bold tracking-widest ${
          score >= 75 ? "text-red-500" :
          score >= 50 ? "text-amber-500" :
          score >= 25 ? "text-yellow-500" :
          "text-green-500"
        }`}>{label} — {score}/100</span>
      </div>

      {/* Industrial linear bar — no border-radius */}
      <div className="w-full h-5 bg-zinc-900 border border-zinc-700 relative overflow-hidden">
        {/* Segment markers */}
        {[25, 50, 75].map((mark) => (
          <div
            key={mark}
            className="absolute top-0 bottom-0 w-px bg-zinc-700 z-10"
            style={{ left: `${mark}%` }}
          />
        ))}
        {/* Fill */}
        <div
          className={`h-full transition-all duration-1000 ease-out ${color}`}
          style={{ width: `${score}%` }}
        />
        {/* Scanline overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: "repeating-linear-gradient(90deg, transparent 0px, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px)"
          }}
        />
      </div>

      {/* Scale labels */}
      <div className="flex justify-between mt-1">
        {["0", "SAFE", "LOW", "MED", "HIGH", "CRIT", "100"].map((l, i) => (
          <span key={i} className="font-mono text-[9px] text-zinc-700">{l}</span>
        ))}
      </div>
    </div>
  );
}
