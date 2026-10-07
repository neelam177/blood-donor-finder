"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaHospital,
  FaMapMarkerAlt,
  FaMinus,
  FaPhoneAlt,
  FaPlus,
  FaUser,
} from "react-icons/fa";
import { clearSession, getToken, getUser } from "@/lib/session";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const URGENCY_OPTIONS = [
  {
    value: "normal",
    title: "Normal",
    text: "Planned, within a few days",
    active: "border-emerald-500 bg-emerald-50 text-emerald-700",
  },
  {
    value: "urgent",
    title: "Urgent",
    text: "Needed within 1 to 2 days",
    active: "border-orange-500 bg-orange-50 text-orange-700",
  },
  {
    value: "critical",
    title: "Critical",
    text: "Needed immediately",
    active: "border-red-600 bg-red-50 text-red-700",
  },
] as const;

interface RequestForm {
  patient_name: string;
  blood_group: string;
  units_needed: number;
  hospital: string;
  city: string;
  contact_phone: string;
  urgency: string;
  needed_by: string;
  note: string;
}

type FormErrors = Partial<Record<keyof RequestForm, string>>;

function todayLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function validate(f: RequestForm): FormErrors {
  const e: FormErrors = {};
  if (f.patient_name.trim().length < 2) e.patient_name = "Enter the patient's name";
  if (!f.blood_group) e.blood_group = "Choose the blood group needed";
  if (f.hospital.trim().length < 2) e.hospital = "Enter the hospital name";
  if (f.city.trim().length < 2) e.city = "Enter the city";
  if (!/^[0-9]{10}$/.test(f.contact_phone.trim())) e.contact_phone = "Phone must be exactly 10 digits";
  if (!f.needed_by) e.needed_by = "Choose the date";
  else if (f.needed_by < todayLocal()) e.needed_by = "Date cannot be in the past";
  return e;
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#D90F2B] focus:bg-white focus:ring-4 focus:ring-red-100";
const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";
const errorClass = "mt-1 text-xs text-red-600";
const iconInInput =
  "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D90F2B]/70";

export default function NewRequestPage() {
  const router = useRouter();

  const [form, setForm] = useState<RequestForm>({
    patient_name: "",
    blood_group: "",
    units_needed: 1,
    hospital: "",
    city: "",
    contact_phone: "",
    urgency: "normal",
    needed_by: todayLocal(),
    note: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/requests/new");
      return;
    }
    const user = getUser();
    if (user?.phone) setForm((prev) => ({ ...prev, contact_phone: user.phone }));
  }, [router]);

  function setField<K extends keyof RequestForm>(key: K, value: RequestForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
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
    setServerError("");
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });

      if (res.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      const data: { success: boolean; message: string } = await res.json();
      if (!res.ok || !data.success) {
        setServerError(data.message || "Could not post request");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/requests"), 1200);
    } catch {
      setServerError("Cannot reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-rose-50/60 px-4 py-6">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-rose-100 ring-1 ring-rose-100 lg:grid-cols-[1fr_1.25fr]">
        {/* ===== LEFT: IMAGE PANEL ===== */}
        <aside className="relative hidden flex-col justify-between bg-gradient-to-br from-[#B80C24] via-[#D90F2B] to-[#EE3A50] p-8 text-white lg:flex">
          <div>
            <Link href="/requests" className="inline-flex items-center gap-2 text-sm font-medium text-red-100 hover:text-white">
              <FaArrowLeft size={12} /> Back to requests
            </Link>
            <h1 className="mt-6 text-3xl font-extrabold leading-tight">
              Need blood?
              <br />
              Tell us what you need.
            </h1>
            <p className="mt-3 max-w-xs text-sm text-red-50">
              Your request is shown to donors in your city. Available donors can respond and contact you directly.
            </p>
          </div>

          <Image
            src="/request-side.svg"
            alt="Hospital with a blood drop"
            width={480}
            height={400}
            className="mx-auto h-auto w-full max-w-sm"
          />

          <ul className="space-y-2 text-sm text-red-50">
            <li className="flex items-center gap-2"><FaCheckCircle /> Double check the blood group</li>
            <li className="flex items-center gap-2"><FaCheckCircle /> Use a phone number that is always reachable</li>
            <li className="flex items-center gap-2"><FaCheckCircle /> Mark the request fulfilled once done</li>
          </ul>
        </aside>

        {/* ===== RIGHT: FORM ===== */}
        <section className="px-6 py-8 sm:px-10">
          <Link href="/requests" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#D90F2B] lg:hidden">
            <FaArrowLeft size={12} /> Back to requests
          </Link>

          <h2 className="text-2xl font-extrabold text-slate-900">Post a blood request</h2>
          <p className="mt-1 text-sm text-slate-500">Fill in the patient and hospital details.</p>

          {success && (
            <div role="status" className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
              <FaCheckCircle /> Request posted. Taking you to the requests page...
            </div>
          )}
          {serverError && (
            <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
            {/* Patient */}
            <div>
              <label htmlFor="patient" className={labelClass}>Patient name</label>
              <div className="relative">
                <FaUser size={14} className={iconInInput} />
                <input
                  id="patient"
                  type="text"
                  value={form.patient_name}
                  onChange={(e) => setField("patient_name", e.target.value)}
                  placeholder="Full name of the patient"
                  className={inputClass}
                />
              </div>
              {errors.patient_name && <p className={errorClass}>{errors.patient_name}</p>}
            </div>

            {/* Blood group */}
            <div>
              <span className={labelClass}>Blood group needed</span>
              <div role="radiogroup" aria-label="Blood group" className="grid grid-cols-4 gap-2.5">
                {BLOOD_GROUPS.map((g) => {
                  const active = form.blood_group === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setField("blood_group", g)}
                      className={`rounded-2xl border-2 py-2.5 text-base font-extrabold transition ${
                        active
                          ? "border-[#D90F2B] bg-gradient-to-br from-[#E5233C] to-[#B80C24] text-white shadow-lg shadow-red-200"
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

            {/* Units + date */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <span className={labelClass}>Units needed</span>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-2 py-1.5">
                  <button
                    type="button"
                    aria-label="Decrease units"
                    onClick={() => setField("units_needed", Math.max(1, form.units_needed - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#D90F2B] shadow-sm hover:bg-red-50"
                  >
                    <FaMinus size={12} />
                  </button>
                  <span className="text-lg font-extrabold text-slate-900">{form.units_needed}</span>
                  <button
                    type="button"
                    aria-label="Increase units"
                    onClick={() => setField("units_needed", Math.min(10, form.units_needed + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#D90F2B] shadow-sm hover:bg-red-50"
                  >
                    <FaPlus size={12} />
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="needed" className={labelClass}>Needed by</label>
                <div className="relative">
                  <FaCalendarAlt size={14} className={iconInInput} />
                  <input
                    id="needed"
                    type="date"
                    min={todayLocal()}
                    value={form.needed_by}
                    onChange={(e) => setField("needed_by", e.target.value)}
                    className={inputClass}
                  />
                </div>
                {errors.needed_by && <p className={errorClass}>{errors.needed_by}</p>}
              </div>
            </div>

            {/* Urgency */}
            <div>
              <span className={labelClass}>Urgency</span>
              <div role="radiogroup" aria-label="Urgency" className="grid gap-2.5 sm:grid-cols-3">
                {URGENCY_OPTIONS.map((o) => {
                  const active = form.urgency === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setField("urgency", o.value)}
                      className={`rounded-2xl border-2 px-3 py-2.5 text-left transition ${
                        active ? o.active : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span className="block text-sm font-bold">{o.title}</span>
                      <span className="block text-xs opacity-80">{o.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hospital + city */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="hospital" className={labelClass}>Hospital</label>
                <div className="relative">
                  <FaHospital size={14} className={iconInInput} />
                  <input
                    id="hospital"
                    type="text"
                    value={form.hospital}
                    onChange={(e) => setField("hospital", e.target.value)}
                    placeholder="Hospital name"
                    className={inputClass}
                  />
                </div>
                {errors.hospital && <p className={errorClass}>{errors.hospital}</p>}
              </div>
              <div>
                <label htmlFor="city" className={labelClass}>City</label>
                <div className="relative">
                  <FaMapMarkerAlt size={14} className={iconInInput} />
                  <input
                    id="city"
                    type="text"
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    placeholder="e.g. Vapi"
                    className={inputClass}
                  />
                </div>
                {errors.city && <p className={errorClass}>{errors.city}</p>}
              </div>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className={labelClass}>Contact phone</label>
              <div className="relative">
                <FaPhoneAlt size={14} className={iconInInput} />
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.contact_phone}
                  onChange={(e) => setField("contact_phone", e.target.value)}
                  placeholder="10 digit mobile number"
                  className={inputClass}
                />
              </div>
              {errors.contact_phone && <p className={errorClass}>{errors.contact_phone}</p>}
            </div>

            {/* Note */}
            <div>
              <label htmlFor="note" className={labelClass}>
                Note <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                id="note"
                rows={3}
                maxLength={500}
                value={form.note}
                onChange={(e) => setField("note", e.target.value)}
                placeholder="Any extra detail donors should know"
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#D90F2B] focus:bg-white focus:ring-4 focus:ring-red-100"
              />
              <p className="mt-1 text-right text-xs text-slate-400">{form.note.length}/500</p>
            </div>

            <button
              type="submit"
              disabled={saving || success}
              className="w-full rounded-full bg-gradient-to-r from-[#E5233C] to-[#B80C24] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Posting..." : "Post request"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}