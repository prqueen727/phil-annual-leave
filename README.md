# 필한방병원 연차관리

입사일만 등록하면 발생 연차가 자동 계산되고, 사용 개수를 입력하면 잔여 연차가 표시되는 앱입니다.
(발생 연차 수식 = 휴가신청서의 B11 수식과 동일)

## 배포 (Vercel)
1. 이 폴더를 GitHub 저장소에 올립니다.
2. Vercel > Add New Project 에서 저장소를 선택 (Framework: Next.js 자동 인식).
3. 프로젝트 > Storage > Create Database > **Neon (Postgres)** 선택 후 프로젝트에 연결 → `DATABASE_URL` 자동 등록.
4. 프로젝트 > Settings > Environment Variables 에 `APP_PASSWORD` (접속 비밀번호) 추가.
5. Deployments 에서 Redeploy. 테이블은 첫 접속 때 자동 생성됩니다.
6. 접속 후 **엑셀 가져오기**로 기존 「부서별 잔여연차 현황」 파일을 올려 직원 등록.

## 매달 쓰는 법
- 휴가신청서를 받으면 직원 행의 **사용 입력** → 연차/반차/반반차 선택 → 입력. 잔여는 즉시 반영됩니다.
- 발생 연차는 **기준일(기본: 오늘)** 로 매번 자동 계산되므로 매달 갱신할 필요가 없습니다.
- 월말 보고용 엑셀은 **엑셀 내보내기**.
- 신규 입사자: + 직원 추가 (부서, 직함, 이름, 입사일). 퇴사자: 직원 정보 수정 > 직원 삭제.

## 로컬 실행
```
npm install
cp .env.example .env.local   # DATABASE_URL, APP_PASSWORD 입력
npm run dev
```
수식 검증: `node scripts/verify-calc.mjs <기존 엑셀 경로> [기준일]`
