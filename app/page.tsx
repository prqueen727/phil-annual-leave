"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { accruedLeave, LEAVE_KINDS, todayKST } from "@/lib/leave";

type Emp = { id: number; dept: string; title: string; name: string; hire_date: string; carry_used: number; log_used: number };
type Log = { id: number; used_on: string; kind: string; amount: number; note: string };

const fmt = (n: number) => (Math.round(n * 100) / 100).toString();
const api = async (url: string, init?: RequestInit) => {
  const r = await fetch(url, init);
  if (r.status === 401) { location.href = "/login"; throw new Error("auth"); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `요청에 실패했습니다. (오류 코드 ${r.status})`);
  return j;
};
const post = (url: string, body: unknown, method = "POST") =>
  api(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export default function Home() {
  const [emps, setEmps] = useState<Emp[] | null>(null);
  const [asOf, setAsOf] = useState(todayKST());
  const [q, setQ] = useState("");
  const [deptF, setDeptF] = useState("전체");
  const [modal, setModal] = useState<number | "new" | null>(null);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2800); };
  const load = useCallback(async () => {
    try { setEmps((await api("/api/employees")).employees); } catch (e: any) { if (e.message !== "auth") say(e.message); setEmps((x) => x ?? []); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const depts = useMemo(() => Array.from(new Set((emps ?? []).map((e) => e.dept))), [emps]);
  const groups = useMemo(() => {
    const list = (emps ?? []).filter((e) => (deptF === "전체" || e.dept === deptF) && (!q || e.name.includes(q) || e.title.includes(q)));
    const m = new Map<string, Emp[]>();
    list.forEach((e) => m.set(e.dept, [...(m.get(e.dept) ?? []), e]));
    return Array.from(m.entries());
  }, [emps, q, deptF]);

  async function doImport(file: File) {
    const replace = confirm(
      "엑셀 가져오기\n\n[확인] 기존 데이터를 모두 지우고 파일 내용으로 교체\n[취소] 기존 데이터는 두고, 없는 직원만 추가\n\n※ 사용연차 열의 값은 '기사용 이월'로 들어갑니다."
    );
    if (replace && !confirm("정말 기존 직원·사용 기록을 모두 삭제하고 교체할까요?")) return;
    const fd = new FormData(); fd.append("file", file); fd.append("mode", replace ? "replace" : "merge");
    try {
      const j = await api("/api/import", { method: "POST", body: fd });
      say(`가져오기 완료: ${j.added}명 추가${j.existed ? `, ${j.existed}명 이미 있음` : ""}${j.skipped?.length ? `, ${j.skipped.length}건 건너뜀` : ""}`);
      if (j.skipped?.length) alert("건너뛴 항목:\n" + j.skipped.join("\n"));
      load();
    } catch (e: any) { alert(e.message); }
  }

  const cur = typeof modal === "number" ? emps?.find((e) => e.id === modal) : undefined;

  return (
    <div className="wrap">
      <header className="top">
        <h1>필한방병원 연차관리</h1>
        <button className="btn ghost sm" onClick={async () => { await post("/api/logout", {}); location.href = "/login"; }}>로그아웃</button>
      </header>

      <div className="bar">
        <label>기준일 <input type="date" value={asOf} onChange={(e) => e.target.value && setAsOf(e.target.value)} /></label>
        {asOf !== todayKST() && <button className="btn sm" onClick={() => setAsOf(todayKST())}>오늘</button>}
        <input placeholder="이름·직함 검색" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="spacer" />
        <button className="btn pri" onClick={() => setModal("new")}>+ 직원 추가</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>엑셀 가져오기</button>
        <a className="btn" href={`/api/export?asOf=${asOf}`}>엑셀 내보내기</a>
        <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) doImport(f); }} />
      </div>

      {depts.length > 1 && (
        <div className="tabs">
          {["전체", ...depts].map((d) => <button key={d} className={"tab" + (deptF === d ? " on" : "")} onClick={() => setDeptF(d)}>{d}</button>)}
        </div>
      )}

      {emps === null && <p className="muted">불러오는 중…</p>}
      {emps?.length === 0 && (
        <div className="notice">등록된 직원이 없습니다. <b>엑셀 가져오기</b>로 기존 「부서별 잔여연차 현황」 파일을 올리거나 <b>+ 직원 추가</b>로 한 명씩 등록하세요.</div>
      )}

      {groups.map(([dept, list]) => (
        <section className="dept" key={dept}>
          <h2>{dept} <small>{list.length}명</small></h2>
          <table className="tbl">
            <thead><tr>
              <th className="l">이름</th><th className="hide-m">직함</th><th className="hide-m">입사일</th>
              <th>발생</th><th>사용</th><th>잔여</th><th></th>
            </tr></thead>
            <tbody>
              {list.map((e) => {
                const acc = accruedLeave(e.hire_date, asOf);
                const used = e.carry_used + e.log_used;
                const rem = acc - used;
                return (
                  <tr key={e.id}>
                    <td className="l"><b>{e.name}</b></td>
                    <td className="hide-m muted">{e.title}</td>
                    <td className="hide-m muted">{e.hire_date}</td>
                    <td className="num">{fmt(acc)}</td>
                    <td className="num">{fmt(used)}</td>
                    <td className={"num rem" + (rem < 0 ? " neg" : "")}>{fmt(rem)}</td>
                    <td><button className="btn sm" onClick={() => setModal(e.id)}>사용 입력</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}

      {modal !== null && (
        <Modal key={String(modal)} emp={cur} depts={depts} asOf={asOf} onClose={() => setModal(null)}
          onChange={load} say={say} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Modal({ emp, depts, asOf, onClose, onChange, say }: {
  emp?: Emp; depts: string[]; asOf: string; onClose: () => void; onChange: () => void; say: (m: string) => void;
}) {
  const isNew = !emp;
  const [logs, setLogs] = useState<Log[]>([]);
  const [kind, setKind] = useState<string>("연차");
  const [count, setCount] = useState("1");
  const [custom, setCustom] = useState("1");
  const [usedOn, setUsedOn] = useState(todayKST());
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(isNew);
  const [f, setF] = useState({ dept: emp?.dept ?? "", title: emp?.title ?? "", name: emp?.name ?? "", hire_date: emp?.hire_date ?? "", carry_used: String(emp?.carry_used ?? 0) });

  const loadLogs = useCallback(async () => {
    if (emp) setLogs((await api(`/api/employees/${emp.id}/logs`)).logs);
  }, [emp?.id]);
  useEffect(() => { loadLogs().catch(() => {}); }, [loadLogs]);

  const unit = LEAVE_KINDS.find((k) => k.key === kind)?.amount;
  const amount = unit ? unit * (Number(count) || 0) : Number(custom) || 0;

  async function addUse() {
    if (!emp || !amount) return;
    try {
      await post(`/api/employees/${emp.id}/logs`, { used_on: usedOn, kind: unit ? `${kind}${Number(count) !== 1 ? ` x${count}` : ""}` : "직접입력", amount, note });
      setNote(""); setCount("1"); await loadLogs(); onChange(); say(`${fmt(amount)}개 사용 입력됨`);
    } catch (e: any) { alert(e.message); }
  }
  async function delLog(id: number) {
    if (!confirm("이 사용 기록을 삭제할까요?")) return;
    await api(`/api/logs/${id}`, { method: "DELETE" }); await loadLogs(); onChange();
  }
  async function save() {
    try {
      const body = { ...f, carry_used: Number(f.carry_used) || 0 };
      if (isNew) await post("/api/employees", body); else await post(`/api/employees/${emp!.id}`, body, "PATCH");
      onChange(); say("저장됨"); if (isNew) onClose(); else setEditing(false);
    } catch (e: any) { alert(e.message); }
  }
  async function del() {
    if (!emp || !confirm(`${emp.name}님과 사용 기록을 모두 삭제할까요? (퇴사자 정리용)`)) return;
    await api(`/api/employees/${emp.id}`, { method: "DELETE" }); onChange(); onClose();
  }

  const acc = emp ? accruedLeave(emp.hire_date, asOf) : 0;
  const used = emp ? emp.carry_used + logs.reduce((s, l) => s + l.amount, 0) : 0;
  const rem = acc - used;

  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h3>{isNew ? "직원 추가" : `${emp!.name} ${emp!.title}`}</h3>
        {!isNew && <div className="muted">{emp!.dept} · 입사 {emp!.hire_date} · 기준일 {asOf}</div>}

        {!isNew && (
          <>
            <div className="sum">
              <div><b>{fmt(acc)}</b><span>발생</span></div>
              <div><b>{fmt(used)}</b><span>사용</span></div>
              <div><b style={{ color: rem < 0 ? "var(--red)" : undefined }}>{fmt(rem)}</b><span>잔여</span></div>
            </div>
            <div className="kinds">
              {[...LEAVE_KINDS.map((k) => k.key as string), "직접입력"].map((k) => (
                <button key={k} className={"btn" + (kind === k ? " on" : "")} onClick={() => setKind(k)}>
                  {k}{LEAVE_KINDS.find((x) => x.key === k) ? ` ${LEAVE_KINDS.find((x) => x.key === k)!.amount}` : ""}
                </button>
              ))}
            </div>
            <div className="row">
              <label className="field">사용일<input type="date" value={usedOn} onChange={(e) => setUsedOn(e.target.value)} /></label>
              {unit
                ? <label className="field">횟수<input type="number" min="1" step="1" value={count} onChange={(e) => setCount(e.target.value)} /></label>
                : <label className="field">사용 개수<input type="number" step="0.25" value={custom} onChange={(e) => setCustom(e.target.value)} /></label>}
              <label className="field" style={{ flex: 2 }}>메모(선택)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 개인사정" /></label>
            </div>
            <button className="btn pri" style={{ width: "100%", padding: 10 }} onClick={addUse}>{fmt(amount)}개 사용 입력</button>

            <ul className="logs">
              {emp!.carry_used > 0 && <li><span className="g muted">기사용 이월 (이전 누적)</span><b>{fmt(emp!.carry_used)}</b><span style={{ width: 52 }} /></li>}
              {logs.map((l) => (
                <li key={l.id}><span className="g">{l.used_on} · {l.kind}{l.note && <span className="muted"> · {l.note}</span>}</span><b>{fmt(l.amount)}</b>
                  <button className="btn sm ghost" onClick={() => delLog(l.id)}>삭제</button></li>
              ))}
              {!logs.length && <li className="muted">입력된 사용 기록이 없습니다.</li>}
            </ul>
            <hr className="hr" />
          </>
        )}

        {editing ? (
          <>
            <div className="row">
              <label className="field">부서<input list="depts" value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value })} /></label>
              <datalist id="depts">{depts.map((d) => <option key={d} value={d} />)}</datalist>
              <label className="field">직함<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
            </div>
            <div className="row">
              <label className="field">이름<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
              <label className="field">입사일<input type="date" value={f.hire_date} onChange={(e) => setF({ ...f, hire_date: e.target.value })} /></label>
            </div>
            <div className="row">
              <label className="field">기사용 이월 (이 앱 사용 전까지의 누적 사용 개수)<input type="number" step="0.25" value={f.carry_used} onChange={(e) => setF({ ...f, carry_used: e.target.value })} /></label>
            </div>
            {f.hire_date && <div className="muted">입사일 기준 현재 발생 연차: <b>{fmt(accruedLeave(f.hire_date, asOf))}</b>개 (기준일 {asOf})</div>}
            <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
              <span>{!isNew && <button className="btn sm danger" onClick={del}>직원 삭제</button>}</span>
              <span style={{ display: "flex", gap: 8 }}>
                <button className="btn ghost" onClick={isNew ? onClose : () => setEditing(false)}>취소</button>
                <button className="btn pri" onClick={save}>저장</button>
              </span>
            </div>
          </>
        ) : (
          <div className="row" style={{ justifyContent: "space-between" }}>
            <button className="btn sm ghost" onClick={() => setEditing(true)}>직원 정보 수정</button>
            <button className="btn" onClick={onClose}>닫기</button>
          </div>
        )}
      </div>
    </div>
  );
}
