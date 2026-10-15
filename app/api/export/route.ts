import ExcelJS from "exceljs";
import { db, EMP_SELECT } from "@/lib/db";
import { accruedLeave, todayKST } from "@/lib/leave";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("asOf");
  const asOf = q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : todayKST();
  const p = await db();
  const { rows } = await p.query(`${EMP_SELECT} ORDER BY (SELECT MIN(id) FROM employees x WHERE x.dept = e.dept), e.id`);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("잔여연차 현황");
  ws.columns = [{ width: 3 }, { width: 14 }, { width: 12 }, { width: 13 }, { width: 11 }, { width: 11 }, { width: 11 }];
  const thin = { style: "thin" as const, color: { argb: "FFBBBBBB" } };
  const border = { top: thin, bottom: thin, left: thin, right: thin };
  ws.getCell("B1").value = `필한방병원 연차 현황 (기준일 ${asOf})`;
  ws.getCell("B1").font = { bold: true, size: 13 };
  let r = 3;
  let dept: string | null = null;
  for (const e of rows) {
    if (e.dept !== dept) {
      dept = e.dept;
      if (r > 3) r++;
      ws.mergeCells(r, 2, r, 7);
      const t = ws.getCell(r, 2);
      t.value = dept; t.font = { bold: true, color: { argb: "FFFFFFFF" } };
      t.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7B2D8E" } };
      r++;
      ["이름", "직함", "입사일자", "발생연차", "사용연차", "잔여연차"].forEach((h, i) => {
        const c = ws.getCell(r, 2 + i); c.value = h; c.font = { bold: true }; c.border = border;
        c.alignment = { horizontal: "center" }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3E8F6" } };
      });
      r++;
    }
    const used = Number(e.carry_used) + Number(e.log_used);
    const vals = [e.name, e.title, new Date(e.hire_date + "T00:00:00Z"), accruedLeave(e.hire_date, asOf), used];
    vals.forEach((v, i) => {
      const c = ws.getCell(r, 2 + i); c.value = v as ExcelJS.CellValue; c.border = border;
      if (i === 2) { c.numFmt = "yyyy-mm-dd"; }
      if (i >= 3) c.alignment = { horizontal: "right" };
    });
    const rem = ws.getCell(r, 7);
    rem.value = { formula: `E${r}-F${r}`, result: accruedLeave(e.hire_date, asOf) - used };
    rem.border = border; rem.numFmt = "0.##;[Red]-0.##"; rem.font = { bold: true };
    r++;
  }
  const buf = await wb.xlsx.writeBuffer();
  const fname = encodeURIComponent(`부서별 잔여연차 현황_${asOf}.xlsx`);
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${fname}`,
    },
  });
}
