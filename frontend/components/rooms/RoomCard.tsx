"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Video, Copy, Check, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Room } from "@/types/room";
import { updateRoomAction, deleteRoomAction } from "@/lib/actions/rooms";

interface RoomCardProps {
  room: Room;
}

export default function RoomCard({ room }: RoomCardProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(room.name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/room/${room.inviteToken}`;

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = editName.trim();
    if (!trimmed || trimmed === room.name) {
      setEditing(false);
      setEditName(room.name);
      return;
    }
    setSaving(true);
    await updateRoomAction(room.inviteToken, trimmed);
    setSaving(false);
    setEditing(false);
  }

  async function handleDelete() {
    setDeleting(true);
    await deleteRoomAction(room.inviteToken);
    setDeleting(false);
    setDeleteOpen(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Video className="w-4 h-4 text-primary" />
        </div>

        {editing ? (
          <form onSubmit={handleRename} className="flex-1 flex gap-1.5">
            <Input
              ref={inputRef}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setEditing(false);
                  setEditName(room.name);
                }
              }}
              onBlur={handleRename}
              className="h-7 text-sm"
              disabled={saving}
            />
          </form>
        ) : (
          <h3 className="font-semibold text-foreground leading-tight truncate flex-1">
            {room.name}
          </h3>
        )}

        {!editing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Created {new Date(room.createdAt).toLocaleDateString("en-GB")}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setEditing(true)}
                className="gap-2 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setDeleteOpen(true)}
                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Copy invite link */}
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{room.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the room and its invite link. Anyone
              with the link will no longer be able to join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete room"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
