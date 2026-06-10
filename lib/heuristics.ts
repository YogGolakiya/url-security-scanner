export interface HeuristicResult {
  threats: string[];
  baseScore: number;
}

const SUSPICIOUS_KEYWORDS = [
  "login", "signin", "secure", "account", "update", "verify",
  "bank", "paypal", "apple", "microsoft", "amazon", "google",
  "suspended", "confirm", "credential", "wallet", "password",
  "free", "prize", "winner", "click-here", "limited-offer",
];

const PHISHING_TLDS = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click"];

export function runHeuristics(url: string): HeuristicResult {
  const threats: string[] = [];
  let score = 0;

  let hostname = "";
  let pathname = "";
  let protocol = "";

  try {
    const parsed = new URL(url);
    hostname = parsed.hostname;
    pathname = parsed.pathname;
    protocol = parsed.protocol;
  } catch {
    return { threats: ["[ MALFORMED ] URL cannot be parsed — structural anomaly detected."], baseScore: 80 };
  }

  // Raw IP address used as domain
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    threats.push("[ IP_HOST ] Raw IP address used as domain — evades domain reputation tracking.");
    score += 35;
  }

  // Excessive subdomains (4+)
  const subdomainCount = hostname.split(".").length - 2;
  if (subdomainCount >= 3) {
    threats.push(`[ SUBDOMAIN ] Excessive subdomain nesting (${subdomainCount} levels) — common in homograph/phishing chains.`);
    score += 20;
  }

  // Suspicious phishing keywords in hostname
  const matchedKeywords = SUSPICIOUS_KEYWORDS.filter((kw) =>
    hostname.toLowerCase().includes(kw) || pathname.toLowerCase().includes(kw)
  );
  if (matchedKeywords.length > 0) {
    threats.push(`[ KEYWORD ] Phishing indicator keywords found: ${matchedKeywords.slice(0, 4).join(", ")}.`);
    score += matchedKeywords.length * 10;
  }

  // Suspicious TLD
  const tld = "." + hostname.split(".").pop();
  if (PHISHING_TLDS.includes(tld)) {
    threats.push(`[ TLD ] High-risk top-level domain detected: "${tld}" — frequently abused for disposable phishing infrastructure.`);
    score += 25;
  }

  // Non-HTTPS protocol
  if (protocol === "http:") {
    threats.push("[ PROTOCOL ] Unencrypted HTTP connection — data interception vector identified.");
    score += 15;
  }

  // Extremely long URL (obfuscation)
  if (url.length > 120) {
    threats.push(`[ OBFUSCATION ] Abnormally long URL (${url.length} chars) — potential parameter stuffing or redirect chain obfuscation.`);
    score += 10;
  }

  // Multiple redirectors or suspicious patterns
  if (url.includes("@")) {
    threats.push("[ REDIRECT ] '@' symbol in URL — can redirect to attacker-controlled host before the '@' symbol.");
    score += 30;
  }

  if (url.includes("//") && url.indexOf("//") !== url.lastIndexOf("//")) {
    threats.push("[ DBLSLASH ] Double-slash injection pattern — potential open redirect exploitation.");
    score += 20;
  }

  // URL-encoded characters (obfuscation)
  const encodedCount = (url.match(/%[0-9a-fA-F]{2}/g) ?? []).length;
  if (encodedCount >= 3) {
    threats.push(`[ ENCODING ] ${encodedCount} URL-encoded characters — masking technique for evasion.`);
    score += 15;
  }

  return { threats, baseScore: Math.min(score, 90) };
}
