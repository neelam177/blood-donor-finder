import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { RowDataPacket } from "mysql2";
import db from "@/lib/db";

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  phone: string;
  role: "user" | "admin";
}

export async function POST(request: Request) {
  try {
    // 1. Secret configured hai ya nahi
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is missing in .env.local");
      return NextResponse.json(
        { success: false, message: "Server configuration error" },
        { status: 500 }
      );
    }

    // 2. Body padho
    let body: LoginBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "email and password are required" },
        { status: 400 }
      );
    }

    // 3. User dhundo
    const [rows] = await db.query<UserRow[]>(
      "SELECT id, name, email, password_hash, phone, role FROM users WHERE email = ?",
      [email]
    );
    const user = rows[0];

    // 4. Password match karo
    // Email ya password galat ho, dono me same message dete hain
    // taaki koi guess na kar sake ki email registered hai ya nahi.
    const isMatch = user
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!user || !isMatch) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    // 5. JWT token banao
    const token = jwt.sign({ id: user.id, role: user.role }, secret, {
      expiresIn: "7d",
    });

    // 6. Response (password_hash kabhi nahi bhejte)
    return NextResponse.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}