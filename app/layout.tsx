import "./globals.css";

export const metadata = { title: "필한방병원 연차관리", description: "부서별 연차 발생·사용·잔여 현황" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
