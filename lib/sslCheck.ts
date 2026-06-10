import https from "https";
import tls from "tls";

export interface SSLResult {
  valid: boolean;
  issuer: string;
  expiry: string;
  daysUntilExpiry: number;
  error?: string;
}

export async function checkSSL(url: string): Promise<SSLResult> {
  return new Promise((resolve) => {
    let hostname = "";
    try {
      hostname = new URL(url).hostname;
    } catch {
      return resolve({ valid: false, issuer: "Unknown", expiry: "Unknown", daysUntilExpiry: -1, error: "Invalid URL" });
    }

    if (!url.startsWith("https://")) {
      return resolve({
        valid: false,
        issuer: "N/A — HTTP",
        expiry: "N/A",
        daysUntilExpiry: -1,
        error: "Non-HTTPS target",
      });
    }

    const options = {
      host: hostname,
      port: 443,
      servername: hostname,
      rejectUnauthorized: false,
      timeout: 4000,
    };

    try {
      const socket = tls.connect(options, () => {
        try {
          const cert = socket.getPeerCertificate();
          socket.destroy();

          if (!cert || Object.keys(cert).length === 0) {
            return resolve({ valid: false, issuer: "Unknown", expiry: "Unknown", daysUntilExpiry: -1, error: "No certificate" });
          }

          const issuerRaw = cert.issuer?.O ?? cert.issuer?.CN ?? "Unknown";
          const issuer = Array.isArray(issuerRaw) ? issuerRaw[0] : (issuerRaw ?? "Unknown");
          const expiryRaw = cert.valid_to ?? "Unknown";
          const expiry = Array.isArray(expiryRaw) ? expiryRaw[0] : (expiryRaw ?? "Unknown");
          const expiryDate = new Date(expiry);
          const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / 86400000);
          const valid = socket.authorized || daysUntilExpiry > 0;

          resolve({ valid, issuer, expiry, daysUntilExpiry });
        } catch (e) {
          resolve({ valid: false, issuer: "Unknown", expiry: "Unknown", daysUntilExpiry: -1, error: String(e) });
        }
      });

      socket.setTimeout(4000, () => {
        socket.destroy();
        resolve({ valid: false, issuer: "Timeout", expiry: "Unknown", daysUntilExpiry: -1, error: "Connection timeout" });
      });

      socket.on("error", (err) => {
        resolve({ valid: false, issuer: "Error", expiry: "Unknown", daysUntilExpiry: -1, error: err.message });
      });
    } catch (e) {
      resolve({ valid: false, issuer: "Unknown", expiry: "Unknown", daysUntilExpiry: -1, error: String(e) });
    }
  });
}

// Suppress the unused import — used indirectly through tls.connect via https agent
void https;
