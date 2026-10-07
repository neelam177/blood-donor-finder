import type { RowDataPacket } from "mysql2";
import db from "@/lib/db";

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export const GENDERS = ["male", "female", "other"] as const;

export type BloodGroup = (typeof BLOOD_GROUPS)[number];
export type Gender = (typeof GENDERS)[number];

export interface DonorInput {
  blood_group: BloodGroup;
  gender: Gender;
  age: number;
  city: string;
  state: string;
  last_donation_date: string | null; // "YYYY-MM-DD" ya null
  is_available: boolean;
}

export interface DonorProfile extends DonorInput {
  id: number;
  user_id: number;
}

type ParseResult =
  | { ok: true; data: DonorInput }
  | { ok: false; message: string };

function isValidPastDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return false;
  return value <= new Date().toISOString().slice(0, 10); // future date allowed nahi
}

// Request body ko check karke saaf DonorInput banata hai
export function parseDonorBody(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "Invalid request body" };
  }
  const b = body as Record<string, unknown>;

  const blood_group = typeof b.blood_group === "string" ? b.blood_group.trim().toUpperCase() : "";
  if (!BLOOD_GROUPS.includes(blood_group as BloodGroup)) {
    return { ok: false, message: "Choose a valid blood group (A+, A-, B+, B-, AB+, AB-, O+, O-)" };
  }

  const gender = typeof b.gender === "string" ? b.gender.trim().toLowerCase() : "";
  if (!GENDERS.includes(gender as Gender)) {
    return { ok: false, message: "Gender must be male, female or other" };
  }

  const age = Number(b.age);
  if (!Number.isInteger(age) || age < 18 || age > 65) {
    return { ok: false, message: "Age must be a whole number between 18 and 65" };
  }

  const city = typeof b.city === "string" ? b.city.trim() : "";
  if (city.length < 2 || city.length > 100) {
    return { ok: false, message: "City must be 2 to 100 characters" };
  }

  const state = typeof b.state === "string" ? b.state.trim() : "";
  if (state.length < 2 || state.length > 100) {
    return { ok: false, message: "State must be 2 to 100 characters" };
  }

  let last_donation_date: string | null = null;
  if (b.last_donation_date !== undefined && b.last_donation_date !== null && b.last_donation_date !== "") {
    if (typeof b.last_donation_date !== "string" || !isValidPastDate(b.last_donation_date)) {
      return { ok: false, message: "Last donation date must be a valid past date (YYYY-MM-DD)" };
    }
    last_donation_date = b.last_donation_date;
  }

  let is_available = true;
  if (b.is_available !== undefined) {
    if (typeof b.is_available !== "boolean") {
      return { ok: false, message: "is_available must be true or false" };
    }
    is_available = b.is_available;
  }

  return {
    ok: true,
    data: {
      blood_group: blood_group as BloodGroup,
      gender: gender as Gender,
      age,
      city,
      state,
      last_donation_date,
      is_available,
    },
  };
}

interface DonorRow extends RowDataPacket {
  id: number;
  user_id: number;
  blood_group: BloodGroup;
  gender: Gender;
  age: number;
  city: string;
  state: string;
  last_donation_date: string | null;
  is_available: number;
}

// User ki profile DB se nikalta hai (nahi hai to null)
export async function getDonorProfile(userId: number): Promise<DonorProfile | null> {
  const [rows] = await db.query<DonorRow[]>(
    `SELECT id, user_id, blood_group, gender, age, city, state,
            DATE_FORMAT(last_donation_date, '%Y-%m-%d') AS last_donation_date,
            is_available
     FROM donor_profiles WHERE user_id = ?`,
    [userId]
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    user_id: r.user_id,
    blood_group: r.blood_group,
    gender: r.gender,
    age: r.age,
    city: r.city,
    state: r.state,
    last_donation_date: r.last_donation_date,
    is_available: Boolean(r.is_available),
  };
}