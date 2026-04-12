import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Header() {
  async function logout() {
    "use server";
    const cookieStore = await cookies();
    cookieStore.delete("token");
    redirect("/login");
  }

  return (
    <header className="border-b border-border bg-background">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary" />
          <span className="font-semibold text-foreground">MeetSync</span>
        </Link>
        <form action={logout}>
          <Button variant="ghost" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
