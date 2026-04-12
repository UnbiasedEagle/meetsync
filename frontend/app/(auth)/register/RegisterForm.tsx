"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterFormValues } from "./schema";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/api/auth";

export default function RegisterForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterFormValues) {
    try {
      await registerUser(values.name, values.email, values.password);
      router.push("/dashboard");
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "Registration failed",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input
          id="name"
          type="text"
          placeholder="John Doe"
          {...register("name")}
        />
        <FieldError errors={[errors.name]} />
      </Field>
      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          {...register("email")}
        />
        <FieldError errors={[errors.email]} />
      </Field>
      <Field>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          {...register("password")}
        />
        <FieldError errors={[errors.password]} />
      </Field>
      {errors.root && (
        <p className="text-sm text-destructive">{errors.root.message}</p>
      )}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-sm text-center text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
