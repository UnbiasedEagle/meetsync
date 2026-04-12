"use client";

import { useState } from "react";
import Link from "next/link";
import { Video, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Room } from "@/lib/data/rooms";

interface RoomCardProps {
  room: Room;
}

export default function RoomCard({ room }: RoomCardProps) {
  const [copied, setCopied] = useState(false);

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/room/${room.inviteToken}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Video className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground leading-tight">
            {room.name}
          </h3>
        </div>
        <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
          {new Date(room.createdAt).toLocaleDateString("en-GB")}
        </span>
      </div>

      <button
        onClick={handleCopy}
        className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted hover:bg-muted/70 transition-colors group cursor-pointer"
      >
        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
          {copied ? "Link copied!" : "Copy invite link"}
        </span>
        {copied ? (
          <Check className="w-4 h-4 text-green-500 shrink-0" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      <Button asChild size="sm" className="w-full">
        <Link href={`/room/${room.inviteToken}`}>Join room</Link>
      </Button>
    </div>
  );
}
