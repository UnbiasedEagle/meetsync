import { cookies } from "next/headers";
import { BACKEND_URL } from "../config";
import { Room } from "@/types/room";

export async function getMyRooms(): Promise<Room[]> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return [];

  const res = await fetch(`${BACKEND_URL}/api/rooms/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return [];

  return res.json();
}

export async function getRoom(inviteToken: string): Promise<Room | null> {
  const res = await fetch(`${BACKEND_URL}/api/rooms/${inviteToken}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}
