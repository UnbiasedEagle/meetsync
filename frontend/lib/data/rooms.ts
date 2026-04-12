import { cookies } from "next/headers";
import { BACKEND_URL } from "../config";

export type Room = {
  id: string;
  name: string;
  inviteToken: string;
  active: boolean;
  createdAt: string;
};

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
