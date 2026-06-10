import https from "https";

export interface SSLResult {
  valid: boolean;
  issuer: string;
  expiry: string;
  daysUntilExpiry: number;
  error?: string;
}

export async function checkSSL(url: string): Promise<SSLResult> {
  let hostname = "";
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname;
    if (parsed.protocol !== "https:") {
      return { valid: false, issuer: "N/A — HTTP", expiry: "N/A", daysUntilExpiry: -1, error: "Non-HTTPS" };
    }
  } catch {
    return { valid: false, issuer: "Unknown", expiry: "Unknown", daysUntilExpiry: -1, error: "Invalid URL" };
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      req.destroy();
      resolve({ valid: false, issuer: "Timeout", expiry: "Unknown", daysUntilExpiry: -1, error: "SSL check timed out" });
    }, 4000);

    const req = https.request(
      { host: hostname, port: 443, path: "/", method: "HEAD", rejectUnauthorized: false, timeout: 3500 },
      (res) => {
        clearTimeout(timer);
        try {
          const socket = res.socket as import("tls").TLSSocket;
          const cert = socket.getPeerCertificate?.();

          if (!cert || !cert.valid_to) {
            return resolve({ valid: false, issuer: "Unknown", expiry: "Unknown", daysUntilExpiry: -1 });
          }

          const issuerRaw = cert.issuer?.O ?? cert.issuer?.CN ?? "Unknown";
          const issuer = Array.isArray(issuerRaw) ? issuerRaw[0] : issuerRaw;
          const expiry = cert.valid_to;
          const expiryDate = new Date(expiry);
          const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / 86400000);

          resolve({ valid: daysUntilExpiry > 0, issuer: issuer ?? "Unknown", expiry, daysUntilExpiry });
        } catch {
          resolve({ valid: false, issuer: "Parse error", expiry: "Unknown", daysUntilExpiry: -1 });
        }
      }
    );

    req.on("error", (err) => {
      clearTimeout(timer);
      const isSSLError = err.message.includes("certificate") || err.message.includes("SSL") || err.message.includes("TLS");
      resolve({ valid: false, issuer: "Error", expiry: "Unknown", daysUntilExpiry: -1, error: isSSLError ? "Invalid SSL cert" : err.message });
    });

    req.end();
  });
}
