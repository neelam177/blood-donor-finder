import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import db from "@/lib/db";
import { getAuthUser } from "../auth/auth";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/donor";

const URGENCIES = ["normal", "urgent", "critical"] as const;
type Urgency = (typeof URGENCIES)[number];

const MAX_LIMIT = 24;
const DEFAULT_LIMIT = 10;

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

interface RequestRow extends RowDataPacket {
  id: number;
  requester_id: number;
  requester_name: string;
  patient_name: string;
  blood_group: BloodGroup;
  units_needed: number;
  hospital: string;
  city: string;
  contact_phone: string;
  urgency: Urgency;
  note: string | null;
  needed_by: string;
  status: "open" | "fulfilled" | "closed";
  created_at: string;
  responses_count: number;
}

interface CountRow extends RowDataPacket {
  total: number;
}

// ---------- GET: open requests ki list ----------
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Blood group (URL me + space ban jata hai, wapas + karte hain)
    const rawGroup = searchParams.get("blood_group");
    let bloodGroup = "";
    if (rawGroup) {
      bloodGroup = rawGroup.replace(/ /g, "+").trim().toUpperCase();
      if (!BLOOD_GROUPS.includes(bloodGroup as BloodGroup)) {
        return NextResponse.json(
          { success: false, message: "Invalid blood group" },
          { status: 400 }
        );
      }
    }

    // Urgency filter
    const rawUrgency = (searchParams.get("urgency") ?? "").trim().toLowerCase();
    if (rawUrgency && !URGENCIES.includes(rawUrgency as Urgency)) {
      return NextResponse.json(
        { success: false, message: "Urgency must be normal, urgent or critical" },
        { status: 400 }
      );
    }

    // City
    const city = (searchParams.get("city") ?? "").trim().slice(0, 100);
    const cityLike = `%${city.replace(/[\\%_]/g, "\\$&")}%`;

    // Pagination
    const page = Math.max(1, Math.floor(Number(searchParams.get("page"))) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Math.floor(Number(searchParams.get("limit"))) || DEFAULT_LIMIT)
    );
    const offset = (page - 1) * limit;

    // WHERE
    let where = "b.status = 'open' AND b.needed_by >= CURDATE()";
    const params: (string | number)[] = [];

    if (bloodGroup) {
      where += " AND b.blood_group = ?";
      params.push(bloodGroup);
    }
    if (rawUrgency) {
      where += " AND b.urgency = ?";
      params.push(rawUrgency);
    }
    if (city) {
      where += " AND b.city LIKE ?";
      params.push(cityLike);
    }

    const [countRows] = await db.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM blood_requests b WHERE ${where}`,
      params
    );
    const total = Number(countRows[0]?.total ?? 0);

    const [rows] = await db.query<RequestRow[]>(
      `SELECT b.id, b.requester_id, u.name AS requester_name,
              b.patient_name, b.blood_group, b.units_needed, b.hospital, b.city,
              b.contact_phone, b.urgency, b.note,
              DATE_FORMAT(b.needed_by, '%Y-%m-%d') AS needed_by,
              b.status, b.created_at,
              (SELECT COUNT(*) FROM request_responses r WHERE r.request_id = b.id) AS responses_count
       FROM blood_requests b
       JOIN users u ON u.id = b.requester_id
       WHERE ${where}
       ORDER BY FIELD(b.urgency, 'critical', 'urgent', 'normal'),
                b.needed_by ASC, b.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const authUser = getAuthUser(request);
    const requests = rows.map((r) => ({
      id: r.id,
      requester_name: r.requester_name,
      patient_name: r.patient_name,
      blood_group: r.blood_group,
      units_needed: r.units_needed,
      hospital: r.hospital,
      city: r.city,
      contact_phone: authUser ? r.contact_phone : null,
      urgency: r.urgency,
      note: r.note,
      needed_by: r.needed_by,
      status: r.status,
      created_at: r.created_at,
      responses_count: Number(r.responses_count),
      is_mine: authUser ? authUser.id === r.requester_id : false,
    }));

    return NextResponse.json({
      success: true,
      requests,
      total,
      page,
      limit,
      total_pages: Math.max(1, Math.ceil(total / limit)),
      logged_in: authUser !== null,
    });
  } catch (error) {
    console.error("List requests error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// ---------- POST: nayi request banao ----------
export async function POST(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Login required" },
        { status: 401 }
      );
    }

    let body: Record<string, unknown>;
    try {
      const parsed: unknown = await request.json();
      if (typeof parsed !== "object" || parsed === null) throw new Error("bad");
      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const fail = (message: string) =>
      NextResponse.json({ success: false, message }, { status: 400 });

    const patient_name = typeof body.patient_name === "string" ? body.patient_name.trim() : "";
    if (patient_name.length < 2 || patient_name.length > 100)
      return fail("Patient name must be 2 to 100 characters");

    const blood_group =
      typeof body.blood_group === "string" ? body.blood_group.trim().toUpperCase() : "";
    if (!BLOOD_GROUPS.includes(blood_group as BloodGroup))
      return fail("Choose a valid blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)");

    const units_needed = Number(body.units_needed);
    if (!Number.isInteger(units_needed) || units_needed < 1 || units_needed > 10)
      return fail("Units needed must be a whole number between 1 and 10");

    const hospital = typeof body.hospital === "string" ? body.hospital.trim() : "";
    if (hospital.length < 2 || hospital.length > 150)
      return fail("Hospital name must be 2 to 150 characters");

    const city = typeof body.city === "string" ? body.city.trim() : "";
    if (city.length < 2 || city.length > 100) return fail("City must be 2 to 100 characters");

    const contact_phone = typeof body.contact_phone === "string" ? body.contact_phone.trim() : "";
    if (!/^[0-9]{10}$/.test(contact_phone)) return fail("Contact phone must be exactly 10 digits");

    let urgency: Urgency = "normal";
    if (body.urgency !== undefined && body.urgency !== null && body.urgency !== "") {
      const u = typeof body.urgency === "string" ? body.urgency.trim().toLowerCase() : "";
      if (!URGENCIES.includes(u as Urgency))
        return fail("Urgency must be normal, urgent or critical");
      urgency = u as Urgency;
    }

    let note: string | null = null;
    if (typeof body.note === "string" && body.note.trim() !== "") {
      note = body.note.trim();
      if (note.length > 500) return fail("Note must be 500 characters or less");
    }

    const needed_by = typeof body.needed_by === "string" ? body.needed_by.trim() : "";
    if (!isValidDate(needed_by)) return fail("Needed-by date must be a valid date (YYYY-MM-DD)");
    if (needed_by < new Date().toISOString().slice(0, 10))
      return fail("Needed-by date cannot be in the past");

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO blood_requests
         (requester_id, patient_name, blood_group, units_needed, hospital, city,
          contact_phone, urgency, note, needed_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        authUser.id,
        patient_name,
        blood_group,
        units_needed,
        hospital,
        city,
        contact_phone,
        urgency,
        note,
        needed_by,
      ]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Blood request posted",
        request: {
          id: result.insertId,
          patient_name,
          blood_group,
          units_needed,
          hospital,
          city,
          contact_phone,
          urgency,
          note,
          needed_by,
          status: "open",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create request error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}