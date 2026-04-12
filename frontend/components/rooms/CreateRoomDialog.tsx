"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import CreateRoomForm from "./CreateRoomForm";

export default function CreateRoomDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Room</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a new room</DialogTitle>
          <DialogDescription>
            Give your room a name. You&apos;ll get a shareable invite link after
            creating it.
          </DialogDescription>
        </DialogHeader>
        <CreateRoomForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
