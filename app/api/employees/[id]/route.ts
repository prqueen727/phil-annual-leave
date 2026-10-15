import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const b = await req.json();
  const p = await db();
  await p.query(
    `UPDATE employees SET dept=COALESCE($2,dept), title=COALESCE($3,title), name=COALESCE($4,name),
       hire_date=COALESCE($5,hire_date), carry_used=COALESCE($6,carry_used) WHERE id=$1`,
    [params.id, b.dept?.trim() || null, b.title ?? null, b.name?.trim() || null, b.hire_date || null, b.carry_used ?? null]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const p = await db();
  await p.query(`DELETE FROM employees WHERE id=$1`, [params.id]);
  return NextResponse.json({ ok: true });
}
