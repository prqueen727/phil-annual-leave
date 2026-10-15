import { NextResponse } from "next/server";
import { db, EMP_SELECT } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const p = await db();
    const { rows } = await p.query(`${EMP_SELECT} ORDER BY (SELECT MIN(id) FROM employees x WHERE x.dept = e.dept), e.id`);
    return NextResponse.json({ employees: rows });
  } catch (e: any) {
    return NextResponse.json({ error: `DB 연결 실패: ${e.message}` }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const b = await req.json();
  const dept = String(b.dept ?? "").trim(), name = String(b.name ?? "").trim();
  if (!dept || !name || !/^\d{4}-\d{2}-\d{2}$/.test(b.hire_date ?? "")) return NextResponse.json({ error: "부서, 이름, 입사일은 필수입니다." }, { status: 400 });
  const p = await db();
  const { rows } = await p.query(
    `INSERT INTO employees (dept, title, name, hire_date, carry_used) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [dept, String(b.title ?? "").trim(), name, b.hire_date, Number(b.carry_used) || 0]
  );
  return NextResponse.json({ id: rows[0].id });
}
