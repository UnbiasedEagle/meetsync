"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginFormValues } from "./schema";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/api/auth";

export default function LoginForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      await loginUser(values.email, values.password);
      router.push("/dashboard");
    } catch (error) {
      setError("root", {
        message: error instanceof Error ? error.message : "Login failed",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
      <p className="text-sm text-center text-muted-foreground">
        Don't have an account?{" "}
        <Link
          href="/register"
          className="text-primary underline-offset-4 hover:underline"
        >
          Register
        </Link>
      </p>
    </form>
  );
}
