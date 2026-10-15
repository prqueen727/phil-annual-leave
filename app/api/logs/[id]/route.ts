import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const p = await db();
  await p.query(`DELETE FROM leave_logs WHERE id=$1`, [params.id]);
  return NextResponse.json({ ok: true });
}
