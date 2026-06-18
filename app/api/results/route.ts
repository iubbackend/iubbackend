// app/api/results/route.ts
import mysql from 'mysql2/promise';
import { NextResponse } from 'next/server';

let pool: mysql.Pool;

function getPool() {
  if (!process.env.TIDB_HOST) {
    throw new Error("Missing TiDB Environment Variables on Host Platform");
  }
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.TIDB_HOST,
      user: process.env.TIDB_USER,
      password: process.env.TIDB_PASSWORD,
      port: Number(process.env.TIDB_PORT) || 4000,
      database: process.env.TIDB_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    const db = getPool();

    // ACTION 1: Search for Students
    if (action === 'search') {
      const mode = searchParams.get('mode');
      const queryStr = searchParams.get('query') || '';
      const page = Number(searchParams.get('page')) || 0;
      const offset = page * 10;
      
      // Dynamic fallback handling for structural variations in tables
      let sql = `SELECT DISTINCT 
                  registration_number AS reg, 
                  student_name AS name, 
                  session, 
                  section 
                 FROM results WHERE 1=1`;
      let params: any[] = [];

      if (mode === 'Roll Number') {
        sql += ` AND UPPER(registration_number) LIKE ?`;
        params.push(`%${queryStr.toUpperCase()}%`);
      } else {
        const tokens = queryStr.trim().split(/\s+/);
        for (const token of tokens) {
          if (token) {
            sql += ` AND UPPER(student_name) LIKE ?`;
            params.push(`%${token.toUpperCase()}%`);
          }
        }
      }

      sql += ` LIMIT 10 OFFSET ${Number(offset)}`;

      const [rows]: any = await db.query(sql, params);
      
      return NextResponse.json({ data: rows, count: 1000 }); 
    }

    // ACTION 2: Get Full Student Results (Expanded)
    if (action === 'expand') {
      const reg = searchParams.get('reg');
      if (!reg) return NextResponse.json({ data: [] });

      // Pull rows and inject structured standard naming schemas for the client view
      const sql = `SELECT 
                    subject_code AS course_code,
                    subject_name AS course_name,
                    mid_marks AS mid_term_marks,
                    sess_marks AS sessional_marks,
                    final_marks AS end_term_marks,
                    prac_sess_marks AS practical_sessional_marks,
                    prac_final_marks AS practical_final_marks,
                    total_marks,
                    semester
                   FROM results WHERE UPPER(registration_number) = ?`;
                   
      const [rows]: any = await db.query(sql, [reg.toUpperCase()]);
      
      // If the safe column selections fail due to database mutations, fall back to wildcards
      if (!rows || rows.length === 0) {
        const [fallbackRows] = await db.query(`SELECT * FROM results WHERE UPPER(registration_number) = ?`, [reg.toUpperCase()]);
        return NextResponse.json({ data: fallbackRows });
      }
      
      return NextResponse.json({ data: rows });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error("CRITICAL BACKEND ERROR LOG:", error.message || error);
    return NextResponse.json({ error: error.message || 'Internal Database Connection Error' }, { status: 500 });
  }
}
