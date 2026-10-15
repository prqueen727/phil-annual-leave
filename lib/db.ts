import { Pool, types } from "pg";

types.setTypeParser(1082, (v) => v); // date -> 'YYYY-MM-DD' 문자열 그대로
types.setTypeParser(1700, (v) => parseFloat(v)); // numeric -> number

const g = globalThis as unknown as { _pool?: Pool; _schema?: Promise<void> };

export function pool(): Pool {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL 환경변수가 설정되지 않았습니다.");
  if (!g._pool) g._pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
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
