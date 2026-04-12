import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");

  if (token) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      {children}
    </main>
  );
}
