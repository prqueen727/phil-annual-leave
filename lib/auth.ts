// 공용 비밀번호 로그인. 쿠키 값 = HMAC(APP_PASSWORD, "leave-auth")
export const COOKIE = "leave_auth";

async function hmac(key: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeToken(): Promise<string> {
  const pw = process.env.APP_PASSWORD;
  if (!pw) throw new Error("APP_PASSWORD 환경변수가 설정되지 않았습니다.");
  return hmac(pw, "leave-auth");
}

export async function isValidToken(token?: string): Promise<boolean> {
  if (!token || !process.env.APP_PASSWORD) return false;
  return token === (await makeToken());
}
