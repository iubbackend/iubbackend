import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

// Create a connection pool to your TiDB database
// Make sure you have these variables in your .env file
const pool = mysql.createPool({
  host: process.env.DB_HOST, // e.g., gateway01.ap-northeast-1.prod.aws.tidbcloud.com
  port: Number(process.env.DB_PORT) || 4000,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, searchQuery, searchMode, department, session, section } = body;

    // ACTION 1: Fetch dropdown filter options
    if (action === "GET_FILTERS") {
      // Adjust these queries based on your actual TiDB table structure
      const [departments] = await pool.query("SELECT DISTINCT department FROM students WHERE department IS NOT NULL");
      const [sessions] = await pool.query("SELECT DISTINCT session FROM students WHERE session IS NOT NULL");
      const [sections] = await pool.query("SELECT DISTINCT section FROM students WHERE section IS NOT NULL");
      
      return NextResponse.json({
        departments: (departments as any[]).map(d => d.department),
        sessions: (sessions as any[]).map(s => s.session),
        sections: (sections as any[]).map(s => s.section),
      });
    }

    // ACTION 2: Search for Results
    if (action === "SEARCH") {
      let query = "";
      let values: any[] = [];

      if (searchMode === "Roll Number") {
        query = "SELECT * FROM results WHERE roll_number = ?";
        values = [searchQuery];
      } else if (searchMode === "Name") {
        query = "SELECT * FROM results WHERE student_name LIKE ?";
        values = [`%${searchQuery}%`];

        if (department !== "All") {
          query += " AND department = ?";
          values.push(department);
        }
        if (session !== "All") {
          query += " AND session = ?";
          values.push(session);
        }
        if (section !== "All") {
          query += " AND section = ?";
          values.push(section);
        }
      } else if (searchMode === "Semester") {
        query = "SELECT * FROM results WHERE semester = ?";
        values = [searchQuery];
      } else if (searchMode === "Section") {
        query = "SELECT * FROM results WHERE section = ?";
        values = [searchQuery];
      }

      const [rows] = await pool.query(query, values);
      return NextResponse.json({ results: rows });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
