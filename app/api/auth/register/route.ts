import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createUser, findUserByEmail } from "@/lib/users";
import { createToken, setSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  const { email, password, name } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json(
      { message: "Email, password, dan nama wajib diisi" },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { message: "Password minimal 8 karakter" },
      { status: 400 },
    );
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return NextResponse.json(
      { message: "Email sudah terdaftar" },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await createUser({ email, passwordHash, name });

  const token = await createToken(user.id);
  await setSessionCookie(token);

  return NextResponse.json({
    data: { id: user.id, email: user.email, name: user.name },
  });
}
