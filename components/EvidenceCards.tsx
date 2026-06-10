"use client";

import { ScanResult } from "@/lib/types";

interface Props {
  result: ScanResult;
}

function EvidenceCard({ title, items }: { title: string; items: { label: string; value: string; flag?: boolean }[] }) {
  return (
    <div className="border border-zinc-700 bg-[#0d0f12] p-4">
      <div className="font-mono text-xs text-zinc-500 tracking-widest uppercase border-b border-zinc-800 pb-2 mb-3">
        ┌─ {title}
      </div>
      <div className="space-y-2">
        {items.map(({ label, value, flag }) => (
          <div key={label} className="flex justify-between items-start gap-4">
            <span className="font-mono text-xs text-zinc-600 uppercase tracking-wider shrink-0">{label}</span>
            <span className={`font-mono text-xs text-right break-all ${flag ? "text-red-400" : "text-zinc-300"}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EvidenceCards({ result }: Props) {
  const { ssl, domain } = result;

  const sslDaysFlag = ssl.daysUntilExpiry < 30 && ssl.daysUntilExpiry >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      <EvidenceCard
        title="Infrastructure Identity"
        items={[
          { label: "Domain Age", value: domain.age },
          { label: "Registrar", value: domain.registrar },
          { label: "First Seen", value: domain.createdDate !== "Unknown" ? new Date(domain.createdDate).toLocaleDateString() : "Unknown" },
          { label: "Host", value: (() => { try { return new URL(result.url).hostname; } catch { return result.url; } })() },
        ]}
      />

      <EvidenceCard
        title="Cryptographic Trust"
        items={[
          { label: "SSL Status", value: ssl.valid ? "VALID ✓" : "INVALID ✗", flag: !ssl.valid },
          { label: "Issuer", value: ssl.issuer },
          { label: "Expiry", value: ssl.expiry },
          { label: "Days Remaining", value: ssl.daysUntilExpiry >= 0 ? `${ssl.daysUntilExpiry} days` : "N/A", flag: sslDaysFlag },
        ]}
      />

      <EvidenceCard
        title="Protocol & Structure"
        items={[
          {
            label: "Protocol",
            value: (() => { try { return new URL(result.url).protocol.toUpperCase().replace(":", ""); } catch { return "UNKNOWN"; } })(),
            flag: !result.url.startsWith("https://"),
          },
          { label: "Threat Count", value: `${result.detectedThreats.length} indicator${result.detectedThreats.length !== 1 ? "s" : ""}`, flag: result.detectedThreats.length > 0 },
          { label: "URL Length", value: `${result.url.length} chars`, flag: result.url.length > 100 },
          { label: "AI Engine", value: result.aiSource === "gemini" ? "Gemini 2.5 Flash" : "Local Heuristic" },
        ]}
      />
    </div>
  );
}
