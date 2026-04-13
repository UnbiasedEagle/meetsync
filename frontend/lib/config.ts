// Used in server actions (server-side only)
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

// Used in client-side code (must have NEXT_PUBLIC_ prefix)
export const PUBLIC_BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";
