// 휴가신청서(B11) 수식을 그대로 옮긴 연차 계산 로직
// 날짜는 타임존 문제를 피하려고 'YYYY-MM-DD' 문자열로만 다룬다.

export type YMD = { y: number; m: number; d: number };

export function parseYMD(s: string): YMD {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

/** 엑셀 DATEDIF(시작, 끝, "M") 와 동일: 만 개월 수 */
export function fullMonths(from: YMD, to: YMD): number {
  let months = (to.y - from.y) * 12 + (to.m - from.m);
  if (to.d < from.d) months -= 1;
  return months;
}

const cmp = (a: YMD, b: YMD) => a.y - b.y || a.m - b.m || a.d - b.d;

/**
 * 입사일 ~ 기준일까지 누적 발생 연차
 *  - 입사 1년 미만: 만 1개월마다 1개 (최대 11)
 *  - 입사 1년 이후: 15개 x 근속연수 + 2년마다 가산분 (+ 2017-05-30 이후 입사자는 1년차 11개 합산)
 */
export function accruedLeave(hireDate: string, asOf: string): number {
  const h = parseYMD(hireDate);
  const a = parseYMD(asOf);
  if (cmp(a, h) < 0) return 0;
  const months = fullMonths(h, a);
  const years = Math.floor(months / 12);
  if (years < 1) return months;
  const base = cmp(h, { y: 2017, m: 5, d: 30 }) >= 0 ? 11 : 0;
  const extra =
    years <= 21
      ? Math.floor(years / 2) * Math.floor((years - 1) / 2)
      : 100 + (years - 21) * 10;
  return base + 15 * years + extra;
}

export function todayKST(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
}

export const LEAVE_KINDS = [
  { key: "연차", amount: 1 },
  { key: "반차", amount: 0.5 },
  { key: "반반차", amount: 0.25 },
] as const;
