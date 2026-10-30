import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const instant = false;

export default async function Home() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  redirect("/login");
}
