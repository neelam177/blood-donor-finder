import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import db from "@/lib/db";
import { getAuthUser } from "../auth";

interface MeRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: "user" | "admin";
}

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Login required" },
        { status: 401 }
      );
    }

    const [rows] = await db.query<MeRow[]>(
      "SELECT id, name, email, phone, role FROM users WHERE id = ?",
      [authUser.id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}