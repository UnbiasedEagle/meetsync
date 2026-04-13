"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createRoomAction, CreateRoomState } from "@/lib/actions/rooms";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function CreateRoomForm() {
  const [state, action, isPending] = useActionState<CreateRoomState, FormData>(
    createRoomAction,
    null,
  );

  const router = useRouter();

  useEffect(() => {
    if (state && "success" in state) {
      router.push(`/room/${state.inviteToken}`);
    }
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="name">Room name</FieldLabel>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="e.g. Weekly Standup"
        />
      </Field>
      {state && "error" in state && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create room"}
      </Button>
    </form>
  );
}
