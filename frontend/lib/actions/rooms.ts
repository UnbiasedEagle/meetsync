"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { BACKEND_URL } from "../config";

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

  const res = await fetch(`${BACKEND_URL}/api/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    return { error: error.message || "Failed to create room" };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
