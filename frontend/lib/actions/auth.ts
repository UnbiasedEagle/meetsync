"use server";

import { cookies } from "next/headers";

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
  const res = await fetch(
    `${process.env.BACKEND_URL || "http://localhost:8080"}/api/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    },
  );

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
  const res = await fetch(
    `${process.env.BACKEND_URL || "http://localhost:8080"}/api/auth/register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    },
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    return { error: error.message || "Registration failed" };
  }

  const data = await res.json();
  await setAuthCookie(data.token);
  return { success: true as const };
}
