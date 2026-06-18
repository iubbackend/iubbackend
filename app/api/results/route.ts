// app/api/results/route.ts
import mysql from 'mysql2/promise';
import { NextResponse } from 'next/server';

// Create a connection pool identical to your Python Streamlit setup
const pool = mysql.createPool({
  host: process.env.TIDB_HOST,
  user: process.env.TIDB_USER,
  password: process.env.TIDB_PASSWORD,
  port: Number(process.env.TIDB_PORT) || 4000,
  database: process.env.TIDB_DATABASE,
  waitForConnections: true,
  connectionLimit: 32,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    // ACTION 1: Search for Students
    if (action === 'search') {
      const mode = searchParams.get('mode');
      const queryStr = searchParams.get('query') || '';
      const page = Number(searchParams.get('page')) || 0;
      
      let sql = `SELECT DISTINCT registration_number as reg, student_name as name, session, section FROM results WHERE 1=1`;
      let params: any[] = [];

      if (mode === 'Roll Number') {
        sql += ` AND UPPER(registration_number) LIKE ?`;
        params.push(`%${queryStr.toUpperCase()}%`);
      } else {
        const tokens = queryStr.split(' ');
        for (const token of tokens) {
          sql += ` AND UPPER(student_name) LIKE ?`;
          params.push(`%${token.toUpperCase()}%`);
        }
      }

      sql += ` LIMIT 10 OFFSET ?`;
      params.push(page * 10);

      const [rows] = await pool.query(sql, params);
      
      // We return a mocked total count for pagination purposes, or you can run a separate COUNT query
      return NextResponse.json({ data: rows, count: 1000 }); 
    }

    // ACTION 2: Get Full Student Results (Expanded)
    if (action === 'expand') {
      const reg = searchParams.get('reg');
      const sql = `SELECT * FROM results WHERE UPPER(registration_number) = ?`;
      const [rows] = await pool.query(sql, [reg?.toUpperCase()]);
      
      return NextResponse.json({ data: rows });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
