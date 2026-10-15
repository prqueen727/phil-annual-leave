import { Pool, types } from "pg";

types.setTypeParser(1082, (v) => v); // date -> 'YYYY-MM-DD' 문자열 그대로
types.setTypeParser(1700, (v) => parseFloat(v)); // numeric -> number

const g = globalThis as unknown as { _pool?: Pool; _schema?: Promise<void> };

// Vercel 연동 방식에 따라 DATABASE_URL 대신 POSTGRES_URL 이나 접두어가 붙은 이름(예: STORAGE_DATABASE_URL)으로 들어올 수 있다
function dbUrl(): string | undefined {
  const env = process.env;
  if (env.DATABASE_URL) return env.DATABASE_URL;
  if (env.POSTGRES_URL) return env.POSTGRES_URL;
  const k = Object.keys(env).find((k) => /_(DATABASE_URL|POSTGRES_URL)$/.test(k) && env[k]);
  return k ? env[k] : undefined;
}

export function pool(): Pool {
  const url = dbUrl();
  if (!url) throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다. Vercel > Storage 에서 Neon 을 프로젝트에 연결한 뒤 Redeploy 하세요.");
  if (!g._pool) g._pool = new Pool({ connectionString: url, max: 3 });
  return g._pool;
}

export async function db(): Promise<Pool> {
  const p = pool();
  if (!g._schema) {
    g._schema = p
      .query(
        `CREATE TABLE IF NOT EXISTS employees (
           id SERIAL PRIMARY KEY,
           dept TEXT NOT NULL,
           title TEXT NOT NULL DEFAULT '',
           name TEXT NOT NULL,
           hire_date DATE NOT NULL,
           carry_used NUMERIC(7,2) NOT NULL DEFAULT 0,
           created_at TIMESTAMPTZ NOT NULL DEFAULT now()
         );
         CREATE TABLE IF NOT EXISTS leave_logs (
           id SERIAL PRIMARY KEY,
           employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
           used_on DATE NOT NULL,
           kind TEXT NOT NULL,
           amount NUMERIC(5,2) NOT NULL,
           note TEXT NOT NULL DEFAULT '',
           created_at TIMESTAMPTZ NOT NULL DEFAULT now()
         );
         CREATE INDEX IF NOT EXISTS leave_logs_emp ON leave_logs(employee_id);`
      )
      .then(() => undefined)
      .catch((e) => { g._schema = undefined; throw e; });
  }
  await g._schema;
  return p;
}

export const EMP_SELECT = `
  SELECT e.id, e.dept, e.title, e.name, e.hire_date, e.carry_used,
         COALESCE((SELECT SUM(amount) FROM leave_logs l WHERE l.employee_id = e.id), 0) AS log_used
  FROM employees e`;
