import Header from "@/components/layout/Header";
import CreateRoomDialog from "@/components/rooms/CreateRoomDialog";
import RoomList from "@/components/rooms/RoomList";
import { getMyRooms } from "@/lib/data/rooms";

export default async function DashboardPage() {
  const rooms = await getMyRooms();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage and create your meetings
            </p>
          </div>
          <CreateRoomDialog />
        </div>
        <RoomList rooms={rooms} />
      </main>
    </div>
  );
}
