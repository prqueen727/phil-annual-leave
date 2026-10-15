import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const p = await db();
  const { rows } = await p.query(
    `SELECT id, used_on, kind, amount, note FROM leave_logs WHERE employee_id=$1 ORDER BY used_on DESC, id DESC`, [params.id]);
  return NextResponse.json({ logs: rows });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const b = await req.json();
  const amount = Number(b.amount);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.used_on ?? "") || !(amount > 0 || amount < 0) || amount > 30)
    return NextResponse.json({ error: "사용일과 사용 개수를 확인해주세요." }, { status: 400 });
  const p = await db();
  await p.query(`INSERT INTO leave_logs (employee_id, used_on, kind, amount, note) VALUES ($1,$2,$3,$4,$5)`,
    [params.id, b.used_on, String(b.kind ?? "직접입력"), amount, String(b.note ?? "")]);
  return NextResponse.json({ ok: true });
}
