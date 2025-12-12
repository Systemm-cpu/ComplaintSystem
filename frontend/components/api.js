// Detect API URL automatically
let base = process.env.NEXT_PUBLIC_API_BASE;

// If not defined, fallback to current host (production safe)
if (!base && typeof window !== "undefined") {
  const { protocol, hostname } = window.location;
  base = `${protocol}//${hostname}:5000`; // backend default port
}

// Final fallback for local development
if (!base) base = "http://localhost:5000";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

