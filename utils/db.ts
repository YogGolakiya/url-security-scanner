import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: Promise<typeof mongoose> | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI ?? "";

if (!MONGODB_URI) {
  console.warn("[DB] MONGODB_URI not set — database features disabled.");
}

async function connectDB(): Promise<typeof mongoose | null> {
  if (!MONGODB_URI) return null;

  if (mongoose.connection.readyState >= 1) return mongoose;

  if (global._mongooseConn) return global._mongooseConn;

  global._mongooseConn = mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
  });

  return global._mongooseConn;
}

export default connectDB;
