import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "./LogoutButton";

export const instant = false;

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-2xl font-bold">Dashboard</h1>
      <p className="mb-6">Halo, {user.name}!</p>
      <p className="mb-6 text-sm text-neutral-600">Email: {user.email}</p>
      <LogoutButton />
    </div>
  );
}
