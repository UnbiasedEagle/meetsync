import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const res = await fetch(
    `${process.env.BACKEND_URL || "http://localhost:8080"}/api/auth/register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const error = await res.json();
    return NextResponse.json(error, { status: res.status });
  }

  const data = await res.json();

  const cookieStore = await cookies();
  cookieStore.set("token", data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return NextResponse.json({ id: data.id, name: data.name, email: data.email });
}
