import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "../../auth/auth";
import { getDonorProfile, parseDonorBody } from "@/lib/donor";

const unauthorized = () =>
  NextResponse.json({ success: false, message: "Login required" }, { status: 401 });

const serverError = () =>
  NextResponse.json(
    { success: false, message: "Something went wrong. Please try again." },
    { status: 500 }
  );

// GET: meri profile
export async function GET(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorized();

    const profile = await getDonorProfile(authUser.id);
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error("Get donor profile error:", error);
    return serverError();
  }
}

// POST: profile pehli baar banao
export async function POST(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorized();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseDonorBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
    }

    const existing = await getDonorProfile(authUser.id);
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Donor profile already exists. Use PUT to update it." },
        { status: 409 }
      );
    }

    const d = parsed.data;
    await db.query(
      `INSERT INTO donor_profiles
         (user_id, blood_group, gender, age, city, state, last_donation_date, is_available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [authUser.id, d.blood_group, d.gender, d.age, d.city, d.state, d.last_donation_date, d.is_available]
    );

    const profile = await getDonorProfile(authUser.id);
    return NextResponse.json(
      { success: true, message: "Donor profile created", profile },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create donor profile error:", error);
    return serverError();
  }
}

// PUT: profile update karo
export async function PUT(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorized();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseDonorBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
    }

    const existing = await getDonorProfile(authUser.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "No donor profile found. Create it first with POST." },
        { status: 404 }
      );
    }

    const d = parsed.data;
    await db.query(
      `UPDATE donor_profiles
       SET blood_group = ?, gender = ?, age = ?, city = ?, state = ?,
           last_donation_date = ?, is_available = ?
       WHERE user_id = ?`,
      [d.blood_group, d.gender, d.age, d.city, d.state, d.last_donation_date, d.is_available, authUser.id]
    );

    const profile = await getDonorProfile(authUser.id);
    return NextResponse.json({ success: true, message: "Donor profile updated", profile });
  } catch (error) {
    console.error("Update donor profile error:", error);
    return serverError();
  }
}

// DELETE: profile delete karo
export async function DELETE(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) return unauthorized();

    const existing = await getDonorProfile(authUser.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "No donor profile found to delete." },
        { status: 404 }
      );
    }

    await db.query("DELETE FROM donor_profiles WHERE user_id = ?", [authUser.id]);

    return NextResponse.json({ 
      success: true, 
      message: "Donor profile deleted successfully" 
    });
  } catch (error) {
    console.error("Delete donor profile error:", error);
    return serverError();
  }
}