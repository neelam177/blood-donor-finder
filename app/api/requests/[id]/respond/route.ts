import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import db from "@/lib/db";
import { getAuthUser } from "@/app/api/auth/auth";
import { getDonorProfile, type BloodGroup } from "@/lib/donor";
import { canDonateTo } from "@/lib/blood";

interface ReqRow extends RowDataPacket {
  requester_id: number;
  blood_group: BloodGroup;
  status: "open" | "fulfilled" | "closed";
  needed_by: string;
  contact_phone: string;
}

export async function POST(
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

    // Optional message
    let message: string | null = null;
    try {
      const body: { message?: unknown } = await request.json();
      if (typeof body.message === "string" && body.message.trim() !== "") {
        message = body.message.trim();
        if (message.length > 255) {
          return NextResponse.json(
            { success: false, message: "Message must be 255 characters or less" },
            { status: 400 }
          );
        }
      }
    } catch {
      // body khali ho to koi dikkat nahi
    }

    // 1. Request mili?
    const [rows] = await db.query<ReqRow[]>(
      `SELECT requester_id, blood_group, status, contact_phone,
              DATE_FORMAT(needed_by, '%Y-%m-%d') AS needed_by
       FROM blood_requests WHERE id = ?`,
      [id]
    );
    const req = rows[0];
    if (!req) {
      return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
    }

    // 2. Apni hi request par nahi
    if (req.requester_id === authUser.id) {
      return NextResponse.json(
        { success: false, message: "You cannot respond to your own request" },
        { status: 403 }
      );
    }

    // 3. Request abhi open aur expire nahi
    const today = new Date().toISOString().slice(0, 10);
    if (req.status !== "open" || req.needed_by < today) {
      return NextResponse.json(
        { success: false, message: "This request is no longer open" },
        { status: 409 }
      );
    }

    // 4. Donor profile honi chahiye
    const profile = await getDonorProfile(authUser.id);
    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Create your donor profile first to respond" },
        { status: 403 }
      );
    }

    // 5. Available hona chahiye
    if (!profile.is_available) {
      return NextResponse.json(
        { success: false, message: "Your profile is marked unavailable. Turn availability on first." },
        { status: 403 }
      );
    }

    // 6. 90 din ka gap
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (profile.last_donation_date && profile.last_donation_date > cutoff) {
      return NextResponse.json(
        { success: false, message: "You donated recently. Please wait 90 days between donations." },
        { status: 403 }
      );
    }

    // 7. Blood group compatible hona chahiye
    if (!canDonateTo(profile.blood_group, req.blood_group)) {
      return NextResponse.json(
        {
          success: false,
          message: `${profile.blood_group} blood cannot be given to a ${req.blood_group} patient`,
        },
        { status: 403 }
      );
    }

    // 8. Pehle se response diya?
    const [existing] = await db.query<RowDataPacket[]>(
      "SELECT id FROM request_responses WHERE request_id = ? AND donor_id = ?",
      [id, authUser.id]
    );
    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: "You have already responded to this request" },
        { status: 409 }
      );
    }

    await db.query(
      "INSERT INTO request_responses (request_id, donor_id, message) VALUES (?, ?, ?)",
      [id, authUser.id, message]
    );

    // Update donor's last_donation_date to today (they just committed to donate)
    const todayDate = new Date().toISOString().slice(0, 10);
    await db.query(
      "UPDATE donor_profiles SET last_donation_date = ? WHERE user_id = ?",
      [todayDate, authUser.id]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Thank you! The requester can now see your response.",
        contact_phone: req.contact_phone,
      },
      { status: 201 }
    );
  } catch (error) {
    // Do requests ek saath aayi to UNIQUE key rok leti hai
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { success: false, message: "You have already responded to this request" },
        { status: 409 }
      );
    }
    console.error("Respond error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}