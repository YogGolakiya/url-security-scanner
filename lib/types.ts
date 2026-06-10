export type VerdictLevel = "Safe" | "Low" | "Medium" | "High" | "Critical";

export interface ScanResult {
  status: "complete" | "aborted";
  url: string;
  verdict: VerdictLevel;
  riskScore: number;
  summary: string;
  detectedThreats: string[];
  ssl: {
    valid: boolean;
    issuer: string;
    expiry: string;
    daysUntilExpiry: number;
  };
  domain: {
    age: string;
    registrar: string;
    createdDate: string;
  };
  aiSource: "gemini" | "heuristic";
  error?: string;
}

export interface HistoryScan {
  _id: string;
  url: string;
  riskScore: number;
  verdict: VerdictLevel;
  createdAt: string;
  summary: string;
}
