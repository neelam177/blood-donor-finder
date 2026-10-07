import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import db from "@/lib/db";
import { getAuthUser } from "../../auth/auth";

interface OwnerRow extends RowDataPacket {
  requester_id: number;
}

export async function DELETE(
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

    const [rows] = await db.query<OwnerRow[]>(
      "SELECT requester_id FROM blood_requests WHERE id = ?",
      [id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
    }

    // Sirf owner ya admin delete kar sakta hai
    if (rows[0].requester_id !== authUser.id && authUser.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "You can only delete your own requests" },
        { status: 403 }
      );
    }

    // Responses apne aap delete ho jayenge (ON DELETE CASCADE)
    await db.query("DELETE FROM blood_requests WHERE id = ?", [id]);
    return NextResponse.json({ success: true, message: "Request deleted" });
  } catch (error) {
    console.error("Delete request error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}