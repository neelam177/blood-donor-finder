"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaTimesCircle,
  FaUser,
} from "react-icons/fa";
import { clearSession, getToken, getUser, type SessionUser } from "@/lib/session";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["male", "female", "other"];
const GAP_DAYS = 90;

interface ProfileForm {
  blood_group: string;
  gender: string;
  age: string;
  city: string;
  state: string;
  last_donation_date: string;
  is_available: boolean;
}

interface ProfileData {
  blood_group: string;
  gender: string;
  age: number;
  city: string;
  state: string;
  last_donation_date: string | null;
  is_available: boolean;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  profile?: ProfileData | null;
}

type FormErrors = Partial<Record<keyof ProfileForm, string>>;

const emptyForm: ProfileForm = {
  blood_group: "",
  gender: "",
  age: "",
  city: "",
  state: "Gujarat",
  last_donation_date: "",
  is_available: true,
};

function toForm(p: ProfileData): ProfileForm {
  return {
    blood_group: p.blood_group,
    gender: p.gender,
    age: String(p.age),
    city: p.city,
    state: p.state,
    last_donation_date: p.last_donation_date ?? "",
    is_available: p.is_available,
  };
}

function todayLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function validate(f: ProfileForm): FormErrors {
  const e: FormErrors = {};
  if (!f.blood_group) e.blood_group = "Choose your blood group";
  if (!f.gender) e.gender = "Choose your gender";
  const age = Number(f.age);
  if (!f.age || !Number.isInteger(age) || age < 18 || age > 65)
    e.age = "Age must be between 18 and 65";
  if (f.city.trim().length < 2) e.city = "Enter your city";
  if (f.state.trim().length < 2) e.state = "Enter your state";
  if (f.last_donation_date && f.last_donation_date > todayLocal())
    e.last_donation_date = "Date cannot be in the future";
  return e;
}

// Last donation se 90 din baad ki date nikalta hai
function eligibility(lastDate: string): { eligible: boolean; text: string } {
  if (!lastDate) return { eligible: true, text: "Eligible to donate now" };
  const next = new Date(`${lastDate}T00:00:00`);
  next.setDate(next.getDate() + GAP_DAYS);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (now >= next) return { eligible: true, text: "Eligible to donate now" };
  const label = next.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return { eligible: false, text: `Can donate again from ${label}` };
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#D90F2B] focus:ring-4 focus:ring-red-100";
const labelClass = "mb-1.5 block text-sm font-semibold text-slate-800";
const errorClass = "mt-1 text-xs text-red-600";

export default function DonorProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [initialForm, setInitialForm] = useState<ProfileForm>(emptyForm); // Track original values
  const [hasProfile, setHasProfile] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loadingPage, setLoadingPage] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [serverError, setServerError] = useState("");

  // Page khulte hi: login check + profile load
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login?next=/dashboard/profile");
      return;
    }
    setUser(getUser());

    async function load() {
      try {
        const res = await fetch("/api/donors/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }
        const data: ApiResponse = await res.json();
        if (data.success && data.profile) {
          const profileForm = toForm(data.profile);
          setForm(profileForm);
          setInitialForm(profileForm); // Save initial state
          setHasProfile(true);
        }
      } catch {
        setServerError("Could not load your profile. Please refresh the page.");
      } finally {
        setLoadingPage(false);
      }
    }
    load();
  }, [router]);

  function setField<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setMessage("");
    setServerError("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setSaving(true);
    setMessage("");
    setServerError("");

    try {
      const res = await fetch("/api/donors/me", {
        method: hasProfile ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          age: Number(form.age),
          last_donation_date: form.last_donation_date || null,
        }),
      });

      if (res.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      const data: ApiResponse = await res.json();
      if (!res.ok || !data.success) {
        setServerError(data.message || "Could not save profile");
        return;
      }

      if (data.profile) setForm(toForm(data.profile));
      setHasProfile(true);
      setMessage(data.message || "Saved");
      
      // Check if form data actually changed before redirecting
      const hasChanges = JSON.stringify(initialForm) !== JSON.stringify(form);
      if (hasChanges) {
        // Only redirect if user made actual changes
        setTimeout(() => {
          router.push("/donors");
          router.refresh();
        }, 1500);
      }
    } catch {
      setServerError("Cannot reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const elig = eligibility(form.last_donation_date);

  return (
    <main className="min-h-screen bg-rose-50/60 pb-12">
      <div className="mx-auto max-w-6xl px-4 pt-6">
        {/* ===== BANNER ===== */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#B80C24] via-[#D90F2B] to-[#EE3A50] text-white shadow-xl">
          <div className="grid items-center md:grid-cols-[1.2fr_1fr]">
            <div className="p-8 md:p-10">
              <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">
                {hasProfile ? "Your donor profile" : "Become a blood donor"}
              </h1>
              <p className="mt-3 max-w-md text-sm text-red-50 md:text-base">
                {hasProfile
                  ? "Keep your details up to date so people can reach you when they need your blood group."
                  : "Fill in a few details. Once saved, people searching for your blood group in your city will be able to find you."}
              </p>
              {user && (
                <p className="mt-4 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium">
                  Signed in as {user.name}
                </p>
              )}
            </div>
            <div className="hidden justify-end md:flex">
              <Image
                src="/profile-banner.svg"
                alt="Blood bag with a heart and heartbeat line"
                width={520}
                height={320}
                priority
                className="h-auto w-full max-w-md"
              />
            </div>
          </div>
        </section>

        {/* ===== CONTENT ===== */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.45fr_1fr]">
          {/* ----- FORM CARD ----- */}
          <section className="rounded-3xl bg-white p-6 shadow-lg shadow-rose-100 sm:p-8">
            <h2 className="text-xl font-bold text-slate-900">Donor details</h2>

            {message && (
              <div
                role="status"
                className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800"
              >
                <FaCheckCircle /> {message}
              </div>
            )}
            {serverError && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800"
              >
                {serverError}
              </div>
            )}

            {loadingPage ? (
              <div className="mt-6 animate-pulse space-y-5">
                <div className="h-12 rounded-lg bg-slate-100" />
                <div className="h-12 rounded-lg bg-slate-100" />
                <div className="h-12 rounded-lg bg-slate-100" />
                <div className="h-12 rounded-lg bg-slate-100" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
                {/* Blood group */}
                <div>
                  <span className={labelClass}>Blood group</span>
                  <div role="radiogroup" aria-label="Blood group" className="grid grid-cols-4 gap-2 sm:gap-3">
                    {BLOOD_GROUPS.map((g) => {
                      const active = form.blood_group === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setField("blood_group", g)}
                          className={`rounded-xl border-2 py-3 text-base font-bold transition ${
                            active
                              ? "border-[#D90F2B] bg-[#D90F2B] text-white shadow-md shadow-red-200"
                              : "border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50"
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                  {errors.blood_group && <p className={errorClass}>{errors.blood_group}</p>}
                </div>

                {/* Gender */}
                <div>
                  <span className={labelClass}>Gender</span>
                  <div role="radiogroup" aria-label="Gender" className="grid grid-cols-3 gap-2 sm:gap-3">
                    {GENDERS.map((g) => {
                      const active = form.gender === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setField("gender", g)}
                          className={`rounded-xl border-2 py-2.5 text-sm font-semibold capitalize transition ${
                            active
                              ? "border-[#D90F2B] bg-red-50 text-[#D90F2B]"
                              : "border-slate-200 bg-white text-slate-700 hover:border-red-300"
                          }`}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                  {errors.gender && <p className={errorClass}>{errors.gender}</p>}
                </div>

                {/* Age + date */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="age" className={labelClass}>Age</label>
                    <input
                      id="age"
                      type="number"
                      inputMode="numeric"
                      min={18}
                      max={65}
                      value={form.age}
                      onChange={(e) => setField("age", e.target.value)}
                      placeholder="18 to 65"
                      className={inputClass}
                    />
                    {errors.age && <p className={errorClass}>{errors.age}</p>}
                  </div>
                  <div>
                    <label htmlFor="lastDate" className={labelClass}>
                      Last donation date <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="lastDate"
                      type="date"
                      max={todayLocal()}
                      value={form.last_donation_date}
                      onChange={(e) => setField("last_donation_date", e.target.value)}
                      className={inputClass}
                    />
                    {errors.last_donation_date && (
                      <p className={errorClass}>{errors.last_donation_date}</p>
                    )}
                  </div>
                </div>

                {/* City + state */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="city" className={labelClass}>City</label>
                    <input
                      id="city"
                      type="text"
                      value={form.city}
                      onChange={(e) => setField("city", e.target.value)}
                      placeholder="e.g. Vapi"
                      className={inputClass}
                    />
                    {errors.city && <p className={errorClass}>{errors.city}</p>}
                  </div>
                  <div>
                    <label htmlFor="state" className={labelClass}>State</label>
                    <input
                      id="state"
                      type="text"
                      value={form.state}
                      onChange={(e) => setField("state", e.target.value)}
                      placeholder="e.g. Gujarat"
                      className={inputClass}
                    />
                    {errors.state && <p className={errorClass}>{errors.state}</p>}
                  </div>
                </div>

                {/* Availability toggle */}
                <div className="flex items-center justify-between rounded-2xl bg-rose-50 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Available to donate</p>
                    <p className="text-xs text-slate-500">
                      Turn this off if you cannot donate right now. You will be hidden from search.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.is_available}
                    aria-label="Available to donate"
                    onClick={() => setField("is_available", !form.is_available)}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                      form.is_available ? "bg-green-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                        form.is_available ? "left-[1.4rem]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-full bg-[#D90F2B] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-[#B80C24] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving..." : hasProfile ? "Save changes" : "Create profile"}
                </button>
              </form>
            )}
          </section>

          {/* ----- LIVE DONOR CARD ----- */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-3xl bg-white shadow-lg shadow-rose-100">
              <div className="bg-gradient-to-br from-[#C20E27] to-[#E5233C] px-6 py-7 text-center text-white">
                <p className="text-xs font-medium tracking-wide text-red-100">Donor card preview</p>
                <div className="mx-auto mt-3 flex h-24 w-24 items-center justify-center rounded-full bg-white text-3xl font-extrabold text-[#D90F2B] shadow-xl ring-4 ring-white/40">
                  {form.blood_group || "?"}
                </div>
                <p className="mt-3 text-lg font-bold">{user?.name ?? "Your name"}</p>
              </div>

              <div className="space-y-4 px-6 py-6 text-sm">
                <div className="flex items-center gap-3 text-slate-700">
                  <FaMapMarkerAlt className="text-[#D90F2B]" />
                  <span>
                    {form.city || "Your city"}
                    {form.state ? `, ${form.state}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <FaUser className="text-[#D90F2B]" />
                  <span className="capitalize">
                    {form.gender || "Gender"}
                    {form.age ? `, ${form.age} years` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-700">
                  <FaCalendarAlt className="text-[#D90F2B]" />
                  <span>
                    {form.last_donation_date
                      ? `Last donated on ${form.last_donation_date}`
                      : "No previous donation added"}
                  </span>
                </div>

                <div
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 font-semibold ${
                    form.is_available
                      ? "bg-green-50 text-green-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {form.is_available ? <FaCheckCircle /> : <FaTimesCircle />}
                  {form.is_available ? "Available for requests" : "Not available right now"}
                </div>

                <p
                  className={`rounded-xl px-4 py-3 text-xs ${
                    elig.eligible ? "bg-rose-50 text-slate-600" : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {elig.text}. Donors must wait {GAP_DAYS} days between donations.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}