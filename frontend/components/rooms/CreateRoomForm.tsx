"use client";

import { useActionState, useEffect } from "react";
import { createRoomAction, CreateRoomState } from "@/lib/actions/rooms";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CreateRoomFormProps {
  onSuccess: () => void;
}

export default function CreateRoomForm({ onSuccess }: CreateRoomFormProps) {
  const [state, action, isPending] = useActionState<CreateRoomState, FormData>(
    createRoomAction,
    null,
  );

  useEffect(() => {
    if (state && "success" in state) {
      onSuccess();
    }
  }, [state, onSuccess]);

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
