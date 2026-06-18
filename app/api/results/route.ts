// app/api/results/route.ts
import mysql from 'mysql2/promise';
import { NextResponse } from 'next/server';

// Global variable to persist the pool across function invocations on Vercel
let pool: mysql.Pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.TIDB_HOST,
      user: process.env.TIDB_USER,
      password: process.env.TIDB_PASSWORD,
      port: Number(process.env.TIDB_PORT) || 4000,
      database: process.env.TIDB_DATABASE,
      waitForConnections: true,
      connectionLimit: 10, // Lowered for Vercel Serverless environments to prevent "Too many connections" errors
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

      // Explicitly append sanitized numbers directly to the string for LIMIT/OFFSET to protect TiDB query processing
      sql += ` LIMIT 10 OFFSET ${Number(offset)}`;

      const [rows] = await db.query(sql, params);
      
      return NextResponse.json({ data: rows, count: 1000 }); 
    }

    // ACTION 2: Get Full Student Results (Expanded)
    if (action === 'expand') {
      const reg = searchParams.get('reg');
      const sql = `SELECT * FROM results WHERE UPPER(registration_number) = ?`;
      const [rows] = await db.query(sql, [reg?.toUpperCase()]);
      
      return NextResponse.json({ data: rows });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error("Database Engine Exception:", error);
    return NextResponse.json({ error: error.message || 'Database error occurred' }, { status: 500 });
  }
}
