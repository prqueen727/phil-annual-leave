import { NextResponse } from "next/server";
import { COOKIE, makeToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  if (!process.env.APP_PASSWORD) return NextResponse.json({ error: "서버에 APP_PASSWORD가 설정되지 않았습니다." }, { status: 500 });
  if (password !== process.env.APP_PASSWORD) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "비밀번호가 맞지 않습니다." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await makeToken(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
}
