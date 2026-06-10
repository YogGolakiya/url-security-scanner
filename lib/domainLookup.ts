export interface DomainInfo {
  domainAge: string;
  registrar: string;
  createdDate: string;
  error?: string;
}

// DNS-over-HTTPS fallback using Cloudflare + RDAP for domain registration data
export async function lookupDomain(url: string): Promise<DomainInfo> {
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
    // Strip subdomains to get registrable domain
    const parts = hostname.split(".");
    if (parts.length > 2) {
      hostname = parts.slice(-2).join(".");
    }
  } catch {
    return { domainAge: "Unknown", registrar: "Unknown", createdDate: "Unknown", error: "Invalid URL" };
  }

  // Try RDAP (Registration Data Access Protocol) — ICANN standard, no rate limits for public use
  try {
    const rdapUrl = `https://rdap.org/domain/${hostname}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(rdapUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      let createdDate = "Unknown";
      let registrar = "Unknown";

      // Extract creation date from events array
      if (Array.isArray(data.events)) {
        const registration = data.events.find(
          (e: { eventAction?: string }) => e.eventAction === "registration"
        );
        if (registration?.eventDate) {
          createdDate = registration.eventDate;
        }
      }

      // Extract registrar from entities
      if (Array.isArray(data.entities)) {
        const reg = data.entities.find((e: { roles?: string[] }) =>
          Array.isArray(e.roles) && e.roles.includes("registrar")
        );
        if (reg?.vcardArray) {
          const vcard = reg.vcardArray[1];
          const fnEntry = Array.isArray(vcard)
            ? vcard.find((v: unknown[]) => Array.isArray(v) && v[0] === "fn")
            : null;
          registrar = fnEntry?.[3] ?? "Unknown";
        }
      }

      const domainAge = computeAge(createdDate);
      return { domainAge, registrar, createdDate };
    }
  } catch {
    // Fallback silently
  }

  // Secondary fallback: whois-json
  try {
    // Dynamic import to avoid build issues in edge environments
    const whois = await import("whois-json");
    const controller2 = new AbortController();
    const timeoutId = setTimeout(() => controller2.abort(), 8000);

    // whois-json doesn't support AbortController, so we race with a timeout promise
    const result = await Promise.race([
      whois.default(hostname),
      new Promise<null>((_, rej) => setTimeout(() => rej(new Error("timeout")), 7000)),
    ]) as Record<string, string> | null;

    clearTimeout(timeoutId);

    if (result) {
      const createdDate =
        result.creationDate ??
        result.created ??
        result["domain name created"] ??
        "Unknown";
      const registrar =
        result.registrar ??
        result["registrar name"] ??
        "Unknown";

      return { domainAge: computeAge(createdDate), registrar, createdDate };
    }
  } catch {
    // Both failed
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
