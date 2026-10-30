import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail, findUserInDatabase } from "@/lib/users";
import { createToken, setSessionCookie } from "@/lib/session";
import { verifySSOCredentials } from "@/lib/sso";

export async function POST(req: Request) {
  const body = await req.json();
  const loginType = body.loginType || "sso";
  const username = body.username || body.nik || body.email;
  const password = body.password;

  if (!username || !password) {
    return NextResponse.json(
      { message: "Username/NIK dan password wajib diisi" },
      { status: 400 },
    );
  }

  // JALUR SSO
  if (loginType === "sso") {
    const ssoResult = await verifySSOCredentials(username, password);
    if (!ssoResult.success) {
      return NextResponse.json(
        { message: ssoResult.message || "Login SSO ditolak" },
        { status: 401 },
      );
    }

    const dbUser = await findUserInDatabase(username);
    if (!dbUser) {
      return NextResponse.json(
        {
          message:
            "Akun SSO valid, tapi tidak memiliki hak akses (tidak terdaftar di tabel users)",
        },
        { status: 403 },
      );
    }

    if (dbUser.status && dbUser.status !== "active") {
      return NextResponse.json(
        { message: "Status akun anda di sistem tidak aktif" },
        { status: 403 },
      );
    }

    const token = await createToken(dbUser.id);
    await setSessionCookie(token);

    return NextResponse.json({
      message: "Login SSO berhasil",
      data: {
        id: dbUser.id,
        username: dbUser.username,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
      },
    });
  }

  // JALUR LOCAL
  const user = await findUserByEmail(username);
  if (!user || !user.passwordHash) {
    return NextResponse.json(
      { message: "Email atau password salah" },
      { status: 401 },
    );
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    return NextResponse.json(
      { message: "Email atau password salah" },
      { status: 401 },
    );
  }

  const token = await createToken(user.id);
  await setSessionCookie(token);

  return NextResponse.json({
    data: { id: user.id, email: user.email, name: user.name },
  });
}
