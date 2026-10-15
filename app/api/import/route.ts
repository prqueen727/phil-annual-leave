import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";

export const maxDuration = 30;

function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object" && v !== null && "richText" in v) return (v as any).richText.map((t: any) => t.text).join("");
  if (typeof v === "object" && v !== null && "result" in v) return String((v as any).result ?? "");
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

function toDate(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  const m = String(v ?? "").match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : null;
}

/** 부서 제목행(셀 1개) 다음에 '이름' 헤더행이 오는 형식(기존 현황 파일)을 읽는다. 직함 열이 있으면 함께 읽는다. */
async function parse(buf: ArrayBuffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const out: { dept: string; title: string; name: string; hire: string; used: number }[] = [];
  const skipped: string[] = [];
  const ws = wb.worksheets[0];
  let dept = "";
  let col: Record<string, number> | null = null;
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: { c: number; t: string; raw: unknown }[] = [];
    row.eachCell({ includeEmpty: false }, (cell, c) => cells.push({ c, t: cellText(cell.value), raw: cell.value }));
    const filled = cells.filter((x) => x.t !== "");
    if (!filled.length) return;
    // 병합된 제목행은 병합 범위의 모든 셀이 같은 값으로 읽히므로 '서로 다른 값이 1개'인 행을 부서 제목으로 본다
    if (new Set(filled.map((x) => x.t)).size === 1) { dept = filled[0].t; col = null; return; }
    if (filled.some((x) => x.t === "이름")) {
      col = {};
      for (const x of filled) {
        if (x.t === "이름") col.name = x.c;
        else if (/^직(함|위|급)/.test(x.t)) col.title = x.c;
        else if (x.t.startsWith("입사")) col.hire = x.c;
        else if (x.t.startsWith("사용")) col.used = x.c;
      }
      return;
    }
    if (!col || !col.name || !col.hire || !dept) return;
    const get = (c?: number) => (c ? row.getCell(c).value : null);
    const name = cellText(get(col.name));
    const hire = toDate(get(col.hire));
    if (!name) return;
    if (!hire) { skipped.push(`${dept} ${name}: 입사일 인식 불가`); return; }
    const u = Number(get(col.used));
    out.push({ dept, title: cellText(get(col.title)), name, hire, used: Number.isFinite(u) ? u : 0 });
  });
  return { rows: out, skipped };
}

export async function POST(req: Request) {
  const fd = await req.formData();
  const file = fd.get("file") as File | null;
  const mode = fd.get("mode") === "replace" ? "replace" : "merge";
  if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  let parsed;
  try { parsed = await parse(await file.arrayBuffer()); }
  catch { return NextResponse.json({ error: "엑셀(.xlsx) 파일을 읽을 수 없습니다." }, { status: 400 }); }
  if (!parsed.rows.length) return NextResponse.json({ error: "가져올 직원 행을 찾지 못했습니다. (부서 제목행 → '이름' 헤더행 형식)" }, { status: 400 });

  const p = await db();
  const client = await p.connect();
  let added = 0, existed = 0;
  try {
    await client.query("BEGIN");
    if (mode === "replace") await client.query("DELETE FROM employees");
    for (const r of parsed.rows) {
      const dup = await client.query(`SELECT 1 FROM employees WHERE dept=$1 AND name=$2`, [r.dept, r.name]);
      if (dup.rowCount) { existed++; continue; }
      await client.query(`INSERT INTO employees (dept,title,name,hire_date,carry_used) VALUES ($1,$2,$3,$4,$5)`, [r.dept, r.title, r.name, r.hire, r.used]);
      added++;
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally { client.release(); }
  return NextResponse.json({ added, existed, skipped: parsed.skipped });
}
