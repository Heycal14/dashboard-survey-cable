"use server";

import { clearSessionCookie } from "@/lib/session";
import { redirect } from "next/navigation";

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
