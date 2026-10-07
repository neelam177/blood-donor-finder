import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import db from "@/lib/db";
import { getAuthUser } from "../../auth/auth";

interface MyResponseRow extends RowDataPacket {
  id: number;
  request_id: number;
  message: string | null;
  response_status: "pending" | "accepted" | "declined";
  created_at: string;
  patient_name: string;
  blood_group: string;
  hospital: string;
  city: string;
  urgency: "normal" | "urgent" | "critical";
  units_needed: number;
  needed_by: string;
  request_status: "open" | "fulfilled" | "closed";
  contact_phone: string;
  requester_name: string;
}

export async function GET(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ success: false, message: "Login required" }, { status: 401 });
    }

    const [rows] = await db.query<MyResponseRow[]>(
      `SELECT r.id, r.request_id, r.message, r.status AS response_status, r.created_at,
              b.patient_name, b.blood_group, b.hospital, b.city, b.urgency, b.units_needed,
              DATE_FORMAT(b.needed_by, '%Y-%m-%d') AS needed_by,
              b.status AS request_status, b.contact_phone,
              u.name AS requester_name
       FROM request_responses r
       JOIN blood_requests b ON b.id = r.request_id
       JOIN users u ON u.id = b.requester_id
       WHERE r.donor_id = ?
       ORDER BY r.created_at DESC`,
      [authUser.id]
    );

    return NextResponse.json({ success: true, responses: rows, total: rows.length });
  } catch (error) {
    console.error("My responses error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}