import mongoose, { Schema, Document } from "mongoose";

export interface IScan extends Document {
  url: string;
  riskScore: number;
  verdict: "Safe" | "Low" | "Medium" | "High" | "Critical";
  detectedThreats: string[];
  summary: string;
  sslValid: boolean;
  sslIssuer: string;
  sslExpiry: string;
  domainAge: string;
  registrar: string;
  createdAt: Date;
}

const ScanSchema = new Schema<IScan>({
  url: { type: String, required: true, index: true },
  riskScore: { type: Number, required: true },
  verdict: { type: String, required: true },
  detectedThreats: [String],
  summary: { type: String, default: "" },
  sslValid: { type: Boolean, default: false },
  sslIssuer: { type: String, default: "Unknown" },
  sslExpiry: { type: String, default: "Unknown" },
  domainAge: { type: String, default: "Unknown" },
  registrar: { type: String, default: "Unknown" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Scan ?? mongoose.model<IScan>("Scan", ScanSchema);
