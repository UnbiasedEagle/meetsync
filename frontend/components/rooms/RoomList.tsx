import { Video } from "lucide-react";
import { Room } from "@/lib/data/rooms";
import RoomCard from "./RoomCard";

interface RoomListProps {
  rooms: Room[];
}

export default function RoomList({ rooms }: RoomListProps) {
  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Video className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="font-medium text-foreground">No rooms yet</p>
        <p className="text-sm text-muted-foreground">
          Create a room and share the invite link to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </div>
  );
}
