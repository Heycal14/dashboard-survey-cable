import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/users";
import { createToken, setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { message: "Email dan password wajib diisi" },
      { status: 400 },
    );
  }

  const user = await findUserByEmail(email);

  if (!user) {
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
