import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Reusable Database Connection
const getDbConnection = async () => {
  return await mysql.createConnection({
    host: process.env.TIDB_HOST,
    user: process.env.TIDB_USER,
    password: process.env.TIDB_PASSWORD,
    database: process.env.TIDB_DATABASE,
    port: parseInt(process.env.TIDB_PORT || '4000'),
    ssl: { minVersion: 'TLSv1.2' }
  });
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, regNo, email, name, password } = body;
    const db = await getDbConnection();

    // 1. SIGNUP LOGIC
    if (action === 'signup') {
      // Check if user already exists
      const [existingUsers]: any = await db.execute(
        'SELECT * FROM subscribers WHERE reg_no = ? OR email = ?', 
        [regNo.toUpperCase(), email]
      );

      if (existingUsers.length > 0) {
        await db.end();
        return NextResponse.json({ error: "User or Email already exists." }, { status: 400 });
      }

      // Hash password here in production (using bcrypt)
      // Save to database
      await db.execute(
        'INSERT INTO subscribers (reg_no, email, name, password) VALUES (?, ?, ?, ?)',
        [regNo.toUpperCase(), email, name, password] // Store hashed password!
      );

      await db.end();
      return NextResponse.json({ success: true, message: "Account created successfully!" });
    }

    // 2. LOGIN LOGIC
    if (action === 'login') {
      const [users]: any = await db.execute(
        'SELECT * FROM subscribers WHERE reg_no = ?',
        [regNo.toUpperCase()]
      );

      if (users.length === 0) {
        await db.end();
        return NextResponse.json({ error: "User not found." }, { status: 404 });
      }

      // Compare passwords (or OTP) here
      const user = users[0];
      if (user.password !== password) { // Use bcrypt.compare in production
        await db.end();
        return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
      }

      // Log the login history (Just like your old push_to_github system)
      await db.execute(
        'INSERT INTO user_records (reg_no, email, name) VALUES (?, ?, ?)',
        [user.reg_no, user.email, user.name]
      );

      await db.end();
      // In Next.js, you would typically return a JWT token or set an HTTP-only cookie here.
      return NextResponse.json({ success: true, user: { name: user.name, regNo: user.reg_no } });
    }

  } catch (error) {
    console.error("Auth API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}