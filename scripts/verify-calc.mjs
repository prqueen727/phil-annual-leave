// 기존 '부서별 잔여연차 현황' 엑셀의 발생연차와 앱 계산값을 대조한다.
// 사용: node scripts/verify-calc.mjs <엑셀경로> [기준일 YYYY-MM-DD]
import ExcelJS from "exceljs";
import { accruedLeave } from "../lib/leave.ts";

const file = process.argv[2];
if (!file) { console.log("엑셀 경로를 넘겨주세요"); process.exit(0); }
const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const ws = wb.worksheets[0];
const rows = [];
ws.eachRow((r) => {
  const name = r.getCell(2).value, hire = r.getCell(3).value, acc = r.getCell(4).value;
  if (hire instanceof Date && typeof acc === "number") rows.push({ name, hire: hire.toISOString().slice(0, 10), acc });
});
const dates = process.argv[3] ? [process.argv[3]] : ["2026-10-01","2026-10-05","2026-10-10","2026-10-15"];
for (const d of dates) {
  const bad = rows.filter((r) => accruedLeave(r.hire, d) !== r.acc);
  console.log(`기준일 ${d}: ${rows.length}명 중 불일치 ${bad.length}명`);
  bad.forEach((r) => console.log(`   ${r.name} 입사 ${r.hire} 엑셀 ${r.acc} / 앱 ${accruedLeave(r.hire, d)}`));
}
