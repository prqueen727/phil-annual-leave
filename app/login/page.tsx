"use client";
import { useState } from "react";

export default function Login() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (r.ok) location.href = "/";
    else { setErr((await r.json().catch(() => ({}))).error || "로그인 실패"); setBusy(false); }
  }
  return (
    <form className="login" onSubmit={submit}>
      <h1>필한방병원 연차관리</h1>
      <input type="password" placeholder="비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
      <div className="err">{err}</div>
      <button className="btn pri" disabled={busy || !pw}>로그인</button>
    </form>
  );
}
