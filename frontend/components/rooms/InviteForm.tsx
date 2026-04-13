"use client";

import { useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { inviteToRoomAction } from "@/lib/actions/rooms";

interface InviteFormProps {
  inviteToken: string;
}

export default function InviteForm({ inviteToken }: InviteFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    const result = await inviteToRoomAction(inviteToken, email);
    if ("success" in result) {
      setStatus("sent");
      setEmail("");
      setTimeout(() => {
        setStatus("idle");
        setOpen(false);
      }, 2000);
    } else {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-transparent border-zinc-700 text-white hover:bg-zinc-800 hover:text-white"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite participant</DialogTitle>
          <DialogDescription>
            Send an email invite with the room join link.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "sending"}
              autoFocus
            />
          </div>
          {status === "sent" && (
            <p className="text-sm text-green-600">Invite sent successfully!</p>
          )}
          {status === "error" && (
            <p className="text-sm text-destructive">
              Failed to send invite. Try again.
            </p>
          )}
          <Button type="submit" disabled={status === "sending" || !email}>
            <Mail className="w-4 h-4 mr-2" />
            {status === "sending" ? "Sending..." : "Send invite"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
