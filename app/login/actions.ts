"use server";

import bcrypt from "bcryptjs";
import { findUserByEmail, findUserInDatabase } from "@/lib/users";
import { createToken, setSessionCookie } from "@/lib/session";
import { verifySSOCredentials } from "@/lib/sso";
import { redirect } from "next/navigation";

export async function loginAction(
  _prevState: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string } | null> {
  const loginType = (formData.get("loginType") as string) || "sso";
  const username = (formData.get("username") as string)?.trim() || "";
  const password = (formData.get("password") as string) || "";

  if (!username || !password) {
    return { error: "Username/NIK dan password wajib diisi" };
  }

  // JALUR 1: SSO LOGIN
  if (loginType === "sso") {
    // 1. Verifikasi SSO eksternal
    const ssoResult = await verifySSOCredentials(username, password);
    if (!ssoResult.success) {
      return { error: ssoResult.message || "Login SSO ditolak" };
    }

    // 2. Cek hak akses di tabel users database
    const dbUser = await findUserInDatabase(username);
    if (!dbUser) {
      return {
        error:
          "Akun SSO valid, tapi tidak memiliki hak akses di sistem ini (tidak terdaftar di database).",
      };
    }

    if (dbUser.status && dbUser.status !== "active") {
      return { error: "Status akun anda di sistem tidak aktif." };
    }

    const token = await createToken(dbUser.id);
    await setSessionCookie(token);
    redirect("/dashboard");
  }

  // JALUR 2: LOCAL / MANUAL LOGIN
  const user = await findUserByEmail(username);
  if (!user || !user.passwordHash) {
    return { error: "Username/email atau password salah" };
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    return { error: "Username/email atau password salah" };
  }

  const token = await createToken(user.id);
  await setSessionCookie(token);
  redirect("/dashboard");
}
