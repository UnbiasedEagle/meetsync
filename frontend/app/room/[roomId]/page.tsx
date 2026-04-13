import { notFound } from "next/navigation";
import { getRoom } from "@/lib/data/rooms";
import { getCurrentUserId } from "@/lib/actions/auth";
import RoomView from "@/components/rooms/RoomView";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const [room, userId] = await Promise.all([
    getRoom(roomId),
    getCurrentUserId(),
  ]);

  if (!room) notFound();

  return <RoomView room={room} userId={userId} />;
}
