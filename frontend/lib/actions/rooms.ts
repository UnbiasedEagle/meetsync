"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type CreateRoomState = { success: true } | { error: string } | null;

export async function createRoomAction(
  _prevState: CreateRoomState,
  formData: FormData,
): Promise<CreateRoomState> {
  const name = (formData.get("name") as string)?.trim();

  if (!name) {
    return { error: "Room name is required" };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return { error: "Unauthorized" };
  }

  const res = await fetch(
    `${process.env.BACKEND_URL || "http://localhost:8080"}/api/rooms`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    },
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    return { error: error.message || "Failed to create room" };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

