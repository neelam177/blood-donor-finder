import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "@/lib/db";

interface RegisterBody {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  phone?: unknown;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;

export async function POST(request: Request) {
  try {
    // 1. Request body padho
    let body: RegisterBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    // 2. Values ko string me convert karke trim karo
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    // 3. Required fields check
    if (!name || !email || !password || !phone) {
      return NextResponse.json(
        {
          success: false,
          message: "name, email, password and phone are required",
        },
        { status: 400 }
      );
    }

    // 4. Validations
    if (name.length < 2 || name.length > 100) {
      return NextResponse.json(
        { success: false, message: "Name must be 2 to 100 characters" },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email) || email.length > 150) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    if (!PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { success: false, message: "Phone must be exactly 10 digits" },
        { status: 400 }
      );
    }

    if (
      password.length < 8 ||
      password.length > 72 ||
      !/[A-Za-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Password must be 8 to 72 characters and contain at least one letter and one number",
        },
        { status: 400 }
      );
    }

    // 5. Email pehle se exist karta hai?
    const [existing] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: "Email is already registered" },
        { status: 409 }
      );
    }

    // 6. Password hash karo (plain password kabhi save nahi hoga)
    const passwordHash = await bcrypt.hash(password, 10);

    // 7. User insert karo
    const [result] = await db.query<ResultSetHeader>(
      "INSERT INTO users (name, email, password_hash, phone) VALUES (?, ?, ?, ?)",
      [name, email, passwordHash, phone]
    );

    // 8. Success response (password_hash wapas kabhi nahi bhejte)
    return NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        user: {
          id: result.insertId,
          name,
          email,
          phone,
          role: "user",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}