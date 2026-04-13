"use server";

import { cookies } from "next/headers";
import { BACKEND_URL } from "@/lib/config";

export type AuthActionResult = { success: true } | { error: string };

async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
}

export async function loginAction(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    return { error: error.message || "Invalid email or password" };
  }

  const data = await res.json();
  await setAuthCookie(data.token);
  return { success: true as const };
}

export async function registerAction(
  name: string,
  email: string,
  password: string,
): Promise<AuthActionResult> {
  const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    return { error: error.message || "Registration failed" };
  }

  const data = await res.json();
  await setAuthCookie(data.token);
  return { success: true as const };
}

export async function getCurrentUserId(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return crypto.randomUUID();
  // decode JWT payload to get userId
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64").toString(),
  );
  return payload.userId ?? crypto.randomUUID();
}
