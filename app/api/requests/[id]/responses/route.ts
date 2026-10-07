import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import db from "@/lib/db";
import { getAuthUser } from "@/app/api/auth/auth";
interface OwnerRow extends RowDataPacket {
  requester_id: number;
}

interface ResponseRow extends RowDataPacket {
  id: number;
  donor_id: number;
  donor_name: string;
  donor_phone: string;
  blood_group: string | null;
  city: string | null;
  message: string | null;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Login required" }, { status: 401 });
    }

    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!Number.isInteger(id) || id < 1) {
      return NextResponse.json({ success: false, message: "Invalid request id" }, { status: 400 });
    }

    const [owner] = await db.query<OwnerRow[]>(
      "SELECT requester_id FROM blood_requests WHERE id = ?",
      [id]
    );
    if (owner.length === 0) {
      return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
    }
    if (owner[0].requester_id !== authUser.id && authUser.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "Only the requester can view responses" },
        { status: 403 }
      );
    }

    const [rows] = await db.query<ResponseRow[]>(
      `SELECT r.id, r.donor_id, u.name AS donor_name, u.phone AS donor_phone,
              d.blood_group, d.city, r.message, r.status, r.created_at
       FROM request_responses r
       JOIN users u ON u.id = r.donor_id
       LEFT JOIN donor_profiles d ON d.user_id = r.donor_id
       WHERE r.request_id = ?
       ORDER BY r.created_at DESC`,
      [id]
    );

    return NextResponse.json({ success: true, responses: rows, total: rows.length });
  } catch (error) {
    console.error("Get responses error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}