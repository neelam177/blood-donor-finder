import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import db from "@/lib/db";
import { getAuthUser } from "../../auth/auth";

interface MineRow extends RowDataPacket {
  id: number;
  patient_name: string;
  blood_group: string;
  units_needed: number;
  hospital: string;
  city: string;
  contact_phone: string;
  urgency: "normal" | "urgent" | "critical";
  note: string | null;
  needed_by: string;
  status: "open" | "fulfilled" | "closed";
  created_at: string;
  responses_count: number;
}

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Login required" }, { status: 401 });
    }

    const [rows] = await db.query<MineRow[]>(
      `SELECT b.id, b.patient_name, b.blood_group, b.units_needed, b.hospital, b.city,
              b.contact_phone, b.urgency, b.note,
              DATE_FORMAT(b.needed_by, '%Y-%m-%d') AS needed_by,
              b.status, b.created_at,
              (SELECT COUNT(*) FROM request_responses r WHERE r.request_id = b.id) AS responses_count
       FROM blood_requests b
       WHERE b.requester_id = ?
       ORDER BY b.created_at DESC`,
      [authUser.id]
    );

    const requests = rows.map((r) => ({ ...r, responses_count: Number(r.responses_count) }));
    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error("My requests error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}