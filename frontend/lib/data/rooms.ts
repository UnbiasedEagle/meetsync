import { cookies } from "next/headers";

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

  const res = await fetch(
    `${process.env.BACKEND_URL || "http://localhost:8080"}/api/rooms/me`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );

  if (!res.ok) return [];

  return res.json();
}
