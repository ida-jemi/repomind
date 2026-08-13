import mongoose from "mongoose";

let isConnected = false;

export async function connectDB() {
  if (!process.env.MONGODB_URI) {
    console.warn(
      "[db] MONGODB_URI not set — running without persistence. " +
        "Analyses will work in-memory for this process only."
    );
    return null;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    isConnected = true;
    console.log(`[db] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error("[db] MongoDB connection failed:", err.message);
    console.warn("[db] Continuing without persistence.");
    return null;
  }
}

export function dbIsConnected() {
  return isConnected;
}
