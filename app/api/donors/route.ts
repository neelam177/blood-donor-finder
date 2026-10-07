import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import db from "@/lib/db";
import { getAuthUser } from "../auth/auth";
import { BLOOD_GROUPS, type BloodGroup } from "@/lib/donor";

interface DonorRow extends RowDataPacket {
  user_id: number;
  name: string;
  phone: string;
  blood_group: BloodGroup;
  gender: "male" | "female" | "other";
  age: number;
  city: string;
  state: string;
  last_donation_date: string | null;
}

interface CountRow extends RowDataPacket {
  total: number;
}

const MAX_LIMIT = 24;
const DEFAULT_LIMIT = 12;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Blood group (URL me + space ban jata hai, isliye wapas + karte hain)
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

    // 2. City (LIKE ke special characters % _ ko escape karte hain)
    const city = (searchParams.get("city") ?? "").trim().slice(0, 100);
    const cityLike = `%${city.replace(/[\\%_]/g, "\\$&")}%`;

    // 3. Pagination
    const page = Math.max(1, Math.floor(Number(searchParams.get("page"))) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Math.floor(Number(searchParams.get("limit"))) || DEFAULT_LIMIT)
    );
    const offset = (page - 1) * limit;

    // 4. WHERE banao (hamesha ? placeholders, SQL injection se bachav)
    let where = `d.is_available = TRUE
      AND (d.last_donation_date IS NULL
           OR d.last_donation_date <= DATE_SUB(CURDATE(), INTERVAL 90 DAY))`;
    const params: (string | number)[] = [];

    if (bloodGroup) {
      where += " AND d.blood_group = ?";
      params.push(bloodGroup);
    }
    if (city) {
      where += " AND d.city LIKE ?";
      params.push(cityLike);
    }

    // 5. Total count
    const [countRows] = await db.query<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM donor_profiles d
       JOIN users u ON u.id = d.user_id
       WHERE ${where}`,
      params
    );
    const total = Number(countRows[0]?.total ?? 0);

    // 6. Donors list
    const [rows] = await db.query<DonorRow[]>(
      `SELECT u.id AS user_id, u.name, u.phone,
              d.blood_group, d.gender, d.age, d.city, d.state,
              DATE_FORMAT(d.last_donation_date, '%Y-%m-%d') AS last_donation_date
       FROM donor_profiles d
       JOIN users u ON u.id = d.user_id
       WHERE ${where}
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // 7. Phone sirf logged-in user ko dikhao
    const loggedIn = getAuthUser(request) !== null;
    const donors = rows.map((r) => ({
      user_id: r.user_id,
      name: r.name,
      phone: loggedIn ? r.phone : null,
      blood_group: r.blood_group,
      gender: r.gender,
      age: r.age,
      city: r.city,
      state: r.state,
      last_donation_date: r.last_donation_date,
    }));

    return NextResponse.json({
      success: true,
      donors,
      total,
      page,
      limit,
      total_pages: Math.max(1, Math.ceil(total / limit)),
      logged_in: loggedIn,
    });
  } catch (error) {
    console.error("Search donors error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}