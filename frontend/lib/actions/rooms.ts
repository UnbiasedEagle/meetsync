"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { BACKEND_URL } from "../config";

export type CreateRoomState =
  | { success: true; inviteToken: string }
  | { error: string }
  | null;

export type RoomActionResult = { success: true } | { error: string };
export type InviteActionResult = { success: true } | { error: string };

async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("token")?.value ?? null;
}

export async function createRoomAction(
  _prevState: CreateRoomState,
  formData: FormData,
): Promise<CreateRoomState> {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Room name is required" };

  const token = await getAuthToken();
  if (!token) return { error: "Unauthorized" };

  const res = await fetch(`${BACKEND_URL}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    return { error: error.message || "Failed to create room" };
  }

  const room = await res.json();
  revalidatePath("/dashboard");
  return { success: true, inviteToken: room.inviteToken };
}

export async function updateRoomAction(
  inviteToken: string,
  name: string,
): Promise<RoomActionResult> {
  const token = await getAuthToken();
  if (!token) return { error: "Unauthorized" };

  try {
    const res = await fetch(`${BACKEND_URL}/api/rooms/${inviteToken}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return { error: "Failed to update room" };
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Failed to update room" };
  }
}

export async function deleteRoomAction(
  inviteToken: string,
): Promise<RoomActionResult> {
  const token = await getAuthToken();
  if (!token) return { error: "Unauthorized" };

  try {
    const res = await fetch(`${BACKEND_URL}/api/rooms/${inviteToken}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { error: "Failed to delete room" };
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Failed to delete room" };
  }
}

export async function inviteToRoomAction(
  inviteToken: string,
  email: string,
): Promise<InviteActionResult> {
  const token = await getAuthToken();
  if (!token) return { error: "Unauthorized" };

  try {
    const res = await fetch(`${BACKEND_URL}/api/rooms/${inviteToken}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) return { error: "Failed to send invite" };
    return { success: true };
  } catch {
    return { error: "Failed to send invite" };
  }
}
