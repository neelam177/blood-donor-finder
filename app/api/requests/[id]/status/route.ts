import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import db from "@/lib/db";
import { getAuthUser } from "@/app/api/auth/auth";

const STATUSES = ["open", "fulfilled", "closed"] as const;
type Status = (typeof STATUSES)[number];

interface OwnerRow extends RowDataPacket {
  requester_id: number;
}

export async function PUT(
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

    let body: { status?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }

    const status = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
    if (!STATUSES.includes(status as Status)) {
      return NextResponse.json(
        { success: false, message: "Status must be open, fulfilled or closed" },
        { status: 400 }
      );
    }

    const [rows] = await db.query<OwnerRow[]>(
      "SELECT requester_id FROM blood_requests WHERE id = ?",
      [id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
    }
    if (rows[0].requester_id !== authUser.id && authUser.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "You can only update your own requests" },
        { status: 403 }
      );
    }

    await db.query("UPDATE blood_requests SET status = ? WHERE id = ?", [status, id]);
    return NextResponse.json({ success: true, message: `Request marked as ${status}`, status });
  } catch (error) {
    console.error("Update status error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}