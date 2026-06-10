export interface DomainInfo {
  domainAge: string;
  registrar: string;
  createdDate: string;
  error?: string;
}

export async function lookupDomain(url: string): Promise<DomainInfo> {
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
    const parts = hostname.split(".");
    if (parts.length > 2) hostname = parts.slice(-2).join(".");
  } catch {
    return { domainAge: "Unknown", registrar: "Unknown", createdDate: "Unknown", error: "Invalid URL" };
  }

  // RDAP with tight 3s timeout — fast enough for Vercel serverless
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://rdap.org/domain/${hostname}`, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      let createdDate = "Unknown";
      let registrar = "Unknown";

      if (Array.isArray(data.events)) {
        const reg = data.events.find((e: { eventAction?: string }) => e.eventAction === "registration");
        if (reg?.eventDate) createdDate = reg.eventDate;
      }

      if (Array.isArray(data.entities)) {
        const reg = data.entities.find((e: { roles?: string[] }) =>
          Array.isArray(e.roles) && e.roles.includes("registrar")
        );
        if (reg?.vcardArray) {
          const vcard = reg.vcardArray[1];
          const fn = Array.isArray(vcard) ? vcard.find((v: unknown[]) => Array.isArray(v) && v[0] === "fn") : null;
          registrar = fn?.[3] ?? "Unknown";
        }
      }

      return { domainAge: computeAge(createdDate), registrar, createdDate };
    }
  } catch {
    // Timeout or network error — skip whois in production (too slow for serverless)
  }

  return { domainAge: "Unknown", registrar: "Unknown", createdDate: "Unknown" };
}

function computeAge(dateStr: string): string {
  if (!dateStr || dateStr === "Unknown") return "Unknown";
  try {
    const created = new Date(dateStr);
    if (isNaN(created.getTime())) return "Unknown";
    const days = Math.floor((Date.now() - created.getTime()) / 86400000);
    if (days < 30) return `${days} day${days !== 1 ? "s" : ""} old — NEWLY REGISTERED`;
    if (days < 365) return `${Math.floor(days / 30)} months old`;
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    return `${years}y ${months}m`;
  } catch {
    return "Unknown";
  }
}
