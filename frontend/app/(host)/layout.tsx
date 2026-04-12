import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HostLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");

  if (!token) {
    redirect("/login");
  }

  return <main>{children}</main>;
}
