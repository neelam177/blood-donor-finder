"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronDown,
  FaClipboardList,
  FaEdit,
  FaHandHoldingHeart,
  FaHospital,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaPlus,
  FaRedoAlt,
  FaSearch,
  FaTimes,
  FaTimesCircle,
  FaTint,
  FaTrash,
  FaUserCircle,
  FaUsers,
} from "react-icons/fa";
import { clearSession, getToken, getUser, type SessionUser } from "@/lib/session";

type Urgency = "normal" | "urgent" | "critical";
type ReqStatus = "open" | "fulfilled" | "closed";
type Tab = "requests" | "responses" | "profile";

interface MyRequest {
  id: number;
  patient_name: string;
  blood_group: string;
  units_needed: number;
  hospital: string;
  city: string;
  urgency: Urgency;
  note: string | null;
  needed_by: string;
  status: ReqStatus;
  created_at: string;
  responses_count: number;
}

interface ResponseItem {
  id: number;
  donor_id: number;
  donor_name: string;
  donor_phone: string;
  blood_group: string | null;
  city: string | null;
  message: string | null;
  created_at: string;
}

interface MyResponse {
  id: number;
  request_id: number;
  message: string | null;
  created_at: string;
  patient_name: string;
  blood_group: string;
  hospital: string;
  city: string;
  urgency: Urgency;
  units_needed: number;
  needed_by: string;
  request_status: ReqStatus;
  contact_phone: string;
  requester_name: string;
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

const URGENCY_STYLE: Record<Urgency, { strip: string; badge: string; label: string }> = {
  critical: { strip: "bg-red-600", badge: "bg-red-600 text-white", label: "Critical" },
  urgent: { strip: "bg-orange-500", badge: "bg-orange-100 text-orange-700", label: "Urgent" },
  normal: { strip: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700", label: "Normal" },
};

const STATUS_LABELS: Record<ReqStatus, string> = {
  open: "Open",
  fulfilled: "Confirmed",
  closed: "Closed",
};

const STATUS_STYLE: Record<ReqStatus, string> = {
  open: "bg-emerald-100 text-emerald-700",
  fulfilled: "bg-sky-100 text-sky-700",
  closed: "bg-slate-200 text-slate-600",
};

function fmtDay(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtStamp(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

async function apiCall<T>(
  path: string,
  method = "GET",
  body?: unknown
): Promise<{ ok: boolean; status: number; json: T }> {
  const token = getToken();
  const res = await fetch(path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as T;
  return { ok: res.ok, status: res.status, json };
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [tab, setTab] = useState<Tab>("requests");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [requests, setRequests] = useState<MyRequest[]>([]);
  const [myResponses, setMyResponses] = useState<MyResponse[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [openId, setOpenId] = useState<number | null>(null);
  const [respMap, setRespMap] = useState<Record<number, ResponseItem[]>>({});
  const [respLoadingId, setRespLoadingId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MyRequest | null>(null);

  const unauthorized = useCallback(() => {
    clearSession();
    router.replace("/login");
  }, [router]);

  function flash(text: string) {
    setNotice(text);
    setTimeout(() => setNotice(""), 3000);
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/dashboard");
      return;
    }
    setUser(getUser());

    async function load() {
      try {
        const [a, b, c] = await Promise.all([
          apiCall<{ success: boolean; requests: MyRequest[] }>("/api/requests/mine"),
          apiCall<{ success: boolean; responses: MyResponse[] }>("/api/responses/mine"),
          apiCall<{ success: boolean; profile: ProfileData | null }>("/api/donors/me"),
        ]);
        if (a.status === 401 || b.status === 401 || c.status === 401) {
          unauthorized();
          return;
        }
        if (a.json.success) setRequests(a.json.requests);
        if (b.json.success) setMyResponses(b.json.responses);
        if (c.json.success) setProfile(c.json.profile);
      } catch {
        setError("Could not load your dashboard. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router, unauthorized]);

  async function toggleResponses(r: MyRequest) {
    if (openId === r.id) {
      setOpenId(null);
      return;
    }
    setOpenId(r.id);
    if (respMap[r.id]) return;

    setRespLoadingId(r.id);
    try {
      const res = await apiCall<{ success: boolean; message?: string; responses: ResponseItem[] }>(
        `/api/requests/${r.id}/responses`
      );
      if (res.status === 401) return unauthorized();
      if (res.json.success) setRespMap((prev) => ({ ...prev, [r.id]: res.json.responses }));
      else setError(res.json.message || "Could not load responses");
    } catch {
      setError("Cannot reach the server.");
    } finally {
      setRespLoadingId(null);
    }
  }

  async function changeStatus(r: MyRequest, status: ReqStatus) {
    setBusyId(r.id);
    setError("");
    try {
      const res = await apiCall<{ success: boolean; message: string }>(
        `/api/requests/${r.id}/status`,
        "PUT",
        { status }
      );
      if (res.status === 401) return unauthorized();
      if (!res.ok || !res.json.success) {
        setError(res.json.message || "Could not update status");
        return;
      }
      setRequests((prev) => prev.map((x) => (x.id === r.id ? { ...x, status } : x)));
      flash(res.json.message);
    } catch {
      setError("Cannot reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const r = deleteTarget;
    setBusyId(r.id);
    setError("");
    try {
      const res = await apiCall<{ success: boolean; message: string }>(
        `/api/requests/${r.id}`,
        "DELETE"
      );
      if (res.status === 401) return unauthorized();
      if (!res.ok || !res.json.success) {
        setError(res.json.message || "Could not delete request");
        return;
      }
      setRequests((prev) => prev.filter((x) => x.id !== r.id));
      if (openId === r.id) setOpenId(null);
      flash("Request deleted");
    } catch {
      setError("Cannot reach the server.");
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  }

  const openCount = requests.filter((r) => r.status === "open").length;
  const receivedCount = requests.reduce((sum, r) => sum + r.responses_count, 0);
  const donorStatus = !profile ? "No profile" : profile.is_available ? "Available" : "Unavailable";

  const stats = [
    { label: "Open requests", value: String(openCount), icon: FaClipboardList },
    { label: "Responses received", value: String(receivedCount), icon: FaUsers },
    { label: "Requests I answered", value: String(myResponses.length), icon: FaHandHoldingHeart },
    { label: "Donor status", value: donorStatus, icon: FaTint },
  ];

  const tabs: { id: Tab; label: string; icon: typeof FaClipboardList; count?: number }[] = [
    { id: "requests", label: "My requests", icon: FaClipboardList, count: requests.length },
    { id: "responses", label: "My responses", icon: FaHandHoldingHeart, count: myResponses.length },
    { id: "profile", label: "My profile", icon: FaUserCircle },
  ];

  return (
    <main className="min-h-screen bg-rose-50/60 pb-14">
      {/* ===== HEADER ===== */}
      <section className="bg-gradient-to-r from-[#B80C24] via-[#D90F2B] to-[#EE3A50] pb-20 pt-6 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4">
          <div>
            <p className="text-sm text-red-100">Dashboard</p>
            <h1 className="text-2xl font-extrabold sm:text-3xl">
              Hi, {user ? user.name.split(" ")[0] : "there"}
            </h1>
            <p className="mt-1 text-sm text-red-50">Manage your requests, responses and donor profile.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/requests/new"
                className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-bold text-[#D90F2B] shadow hover:bg-red-50"
              >
                <FaPlus size={12} /> Request blood
              </Link>
              <Link
                href="/donors"
                className="flex items-center gap-2 rounded-full border border-white/70 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                <FaSearch size={12} /> Find donors
              </Link>
            </div>
          </div>
          <Image
            src="/profile-banner.svg"
            alt=""
            width={520}
            height={320}
            className="hidden h-32 w-auto md:block"
          />
        </div>
      </section>

      <div className="mx-auto -mt-12 max-w-6xl px-4">
        {/* ===== STATS ===== */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-lg shadow-rose-100 ring-1 ring-rose-100">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#D90F2B]">
                <Icon size={18} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold text-slate-900">{loading ? "..." : value}</p>
                <p className="truncate text-xs text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ===== TABS ===== */}
        <div className="mt-6 flex gap-2 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-rose-100" role="tablist">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                tab === id
                  ? "bg-gradient-to-r from-[#E5233C] to-[#B80C24] text-white shadow-md shadow-red-200"
                  : "text-slate-600 hover:bg-red-50"
              }`}
            >
              <Icon size={14} />
              {label}
              {count !== undefined && !loading && (
                <span className={`rounded-full px-2 py-0.5 text-xs ${tab === id ? "bg-white/25" : "bg-slate-100 text-slate-600"}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {notice && (
          <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-800">
            <FaCheckCircle /> {notice}
          </div>
        )}
        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-5 space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-3xl bg-white ring-1 ring-rose-100" />
            ))}
          </div>
        ) : (
          <>
            {/* ===================== MY REQUESTS ===================== */}
            {tab === "requests" && (
              <div className="mt-5 space-y-4">
                {requests.length === 0 ? (
                  <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-12 text-center shadow-md shadow-rose-100 ring-1 ring-rose-100">
                    <Image src="/empty-donors.svg" alt="" width={320} height={240} className="h-auto w-56" />
                    <h2 className="mt-4 text-lg font-bold text-slate-900">You have not requested blood yet</h2>
                    <p className="mt-1 text-sm text-slate-500">Need blood for someone? Request it and donors will respond.</p>
                    <Link href="/requests/new" className="mt-5 rounded-full bg-[#D90F2B] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-200 hover:bg-[#B80C24]">
                      Request blood
                    </Link>
                  </div>
                ) : (
                  requests.map((r) => {
                    const u = URGENCY_STYLE[r.urgency];
                    const isOpen = openId === r.id;
                    const list = respMap[r.id];
                    const count = list ? list.length : r.responses_count;
                    const busy = busyId === r.id;
                    return (
                      <article key={r.id} className="overflow-hidden rounded-3xl bg-white shadow-md shadow-rose-100 ring-1 ring-rose-100">
                        <div className="flex">
                          <div className={`w-2 shrink-0 ${u.strip}`} aria-hidden />
                          <div className="min-w-0 flex-1 p-5">
                            <div className="flex flex-wrap items-start gap-4">
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E5233C] to-[#B80C24] text-lg font-extrabold text-white shadow-lg shadow-red-200">
                                {r.blood_group}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-bold text-slate-900">{r.patient_name}</h3>
                                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${u.badge}`}>{u.label}</span>
                                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${STATUS_STYLE[r.status]}`}>
                                    {r.status}
                                  </span>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                                  <span className="flex items-center gap-1.5"><FaHospital className="text-[#D90F2B]" /> {r.hospital}</span>
                                  <span className="flex items-center gap-1.5"><FaMapMarkerAlt className="text-[#D90F2B]" /> {r.city}</span>
                                  <span className="flex items-center gap-1.5"><FaTint className="text-[#D90F2B]" /> {r.units_needed} {r.units_needed === 1 ? "unit" : "units"}</span>
                                  <span className="flex items-center gap-1.5"><FaCalendarAlt className="text-[#D90F2B]" /> By {fmtDay(r.needed_by)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleResponses(r)}
                                aria-expanded={isOpen}
                                className="flex items-center gap-2 rounded-full border-2 border-[#D90F2B] px-4 py-1.5 text-sm font-bold text-[#D90F2B] transition hover:bg-red-50"
                              >
                                <FaUsers size={13} /> {count} {count === 1 ? "response" : "responses"}
                                <FaChevronDown size={11} className={`transition ${isOpen ? "rotate-180" : ""}`} />
                              </button>

                              <div className="ml-auto flex flex-wrap gap-2">
                                {r.status === "open" ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => changeStatus(r, "fulfilled")}
                                      className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                                    >
                                      <FaCheckCircle size={12} /> Mark fulfilled
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => changeStatus(r, "closed")}
                                      className="flex items-center gap-1.5 rounded-full border-2 border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                                    >
                                      <FaTimesCircle size={12} /> Close
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => changeStatus(r, "open")}
                                    className="flex items-center gap-1.5 rounded-full border-2 border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                                  >
                                    <FaRedoAlt size={11} /> Reopen
                                  </button>
                                )}
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setDeleteTarget(r)}
                                  aria-label={`Delete request for ${r.patient_name}`}
                                  className="flex items-center gap-1.5 rounded-full border-2 border-red-200 px-4 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                                >
                                  <FaTrash size={11} /> Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Responses dropdown */}
                        {isOpen && (
                          <div className="border-t border-rose-100 bg-rose-50/50 px-5 py-4">
                            {respLoadingId === r.id ? (
                              <p className="text-sm text-slate-500">Loading responses...</p>
                            ) : !list || list.length === 0 ? (
                              <p className="text-sm text-slate-500">No one has responded yet. Donors in your city can see this request.</p>
                            ) : (
                              <ul className="space-y-3">
                                {list.map((d) => (
                                  <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-rose-100">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-sm font-extrabold text-[#D90F2B]">
                                      {d.blood_group ?? "?"}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-bold text-slate-900">
                                        {d.donor_name}
                                        {d.city && <span className="font-normal text-slate-500"> · {d.city}</span>}
                                      </p>
                                      {d.message && <p className="truncate text-xs text-slate-600">&ldquo;{d.message}&rdquo;</p>}
                                      <p className="text-xs text-slate-400">Responded {fmtStamp(d.created_at)}</p>
                                    </div>
                                    <a
                                      href={`tel:${d.donor_phone}`}
                                      className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#E5233C] to-[#B80C24] px-4 py-2 text-sm font-bold text-white shadow-md shadow-red-200 hover:brightness-110"
                                    >
                                      <FaPhoneAlt size={12} /> {d.donor_phone}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            )}

            {/* ===================== MY RESPONSES ===================== */}
            {tab === "responses" && (
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {myResponses.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center rounded-3xl bg-white px-6 py-12 text-center shadow-md shadow-rose-100 ring-1 ring-rose-100">
                    <Image src="/empty-donors.svg" alt="" width={320} height={240} className="h-auto w-56" />
                    <h2 className="mt-4 text-lg font-bold text-slate-900">No responses yet</h2>
                    <p className="mt-1 text-sm text-slate-500">When you tap &quot;I can donate&quot; on a request, it will appear here.</p>
                    <Link href="/requests" className="mt-5 rounded-full bg-[#D90F2B] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-200 hover:bg-[#B80C24]">
                      Browse requests
                    </Link>
                  </div>
                ) : (
                  myResponses.map((m) => {
                    const u = URGENCY_STYLE[m.urgency];
                    return (
                      <article key={m.id} className="flex overflow-hidden rounded-3xl bg-white shadow-md shadow-rose-100 ring-1 ring-rose-100">
                        <div className={`w-2 shrink-0 ${u.strip}`} aria-hidden />
                        <div className="flex min-w-0 flex-1 flex-col p-5">
                          <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E5233C] to-[#B80C24] text-lg font-extrabold text-white shadow-lg shadow-red-200">
                              {m.blood_group}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-lg font-bold text-slate-900">{m.patient_name}</h3>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${u.badge}`}>{u.label}</span>
                              </div>
                              <p className="mt-0.5 text-xs text-slate-500">Requested by {m.requester_name}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[m.request_status]}`}>
                              {STATUS_LABELS[m.request_status]}
                            </span>
                          </div>

                          <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                            <p className="flex items-center gap-2"><FaHospital className="shrink-0 text-[#D90F2B]" /> {m.hospital}, {m.city}</p>
                            <p className="flex items-center gap-2"><FaCalendarAlt className="shrink-0 text-[#D90F2B]" /> Needed by {fmtDay(m.needed_by)}</p>
                          </div>

                          {m.message && (
                            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-slate-600">
                              Your message: &ldquo;{m.message}&rdquo;
                            </p>
                          )}

                          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                            <span className="text-xs text-slate-400">Responded {fmtStamp(m.created_at)}</span>
                            {m.request_status === "open" ? (
                              <a
                                href={`tel:${m.contact_phone}`}
                                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#E5233C] to-[#B80C24] px-4 py-2 text-sm font-bold text-white shadow-md shadow-red-200 hover:brightness-110"
                              >
                                <FaPhoneAlt size={12} /> Call {m.contact_phone}
                              </a>
                            ) : m.request_status === "fulfilled" ? (
                              <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-4 py-2 text-xs font-bold text-green-700">
                                <FaCheckCircle size={12} /> Donor confirmed - Thank you! 🎉
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-500">
                                Request closed
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            )}

            {/* ===================== MY PROFILE ===================== */}
            {tab === "profile" && (
              <div className="mt-5">
                {!profile ? (
                  <div className="flex flex-col items-center rounded-3xl bg-white px-6 py-12 text-center shadow-md shadow-rose-100 ring-1 ring-rose-100">
                    <Image src="/empty-donors.svg" alt="" width={320} height={240} className="h-auto w-56" />
                    <h2 className="mt-4 text-lg font-bold text-slate-900">You are not listed as a donor</h2>
                    <p className="mt-1 max-w-sm text-sm text-slate-500">
                      Create your donor profile so people can find you and you can respond to requests.
                    </p>
                    <Link href="/dashboard/profile" className="mt-5 rounded-full bg-[#D90F2B] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-200 hover:bg-[#B80C24]">
                      Create donor profile
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-3xl bg-white shadow-md shadow-rose-100 ring-1 ring-rose-100">
                    <div className="flex flex-wrap items-center gap-5 bg-gradient-to-r from-[#C20E27] to-[#E5233C] px-6 py-6 text-white">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-2xl font-extrabold text-[#D90F2B] shadow-xl ring-4 ring-white/40">
                        {profile.blood_group}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-xl font-extrabold">{user?.name}</h2>
                        <p className="text-sm text-red-100">{user?.email}</p>
                        <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${profile.is_available ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                          {profile.is_available ? <FaCheckCircle /> : <FaTimesCircle />}
                          {profile.is_available ? "Available for requests" : "Not available right now"}
                        </span>
                      </div>
                      <Link
                        href="/dashboard/profile"
                        className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#D90F2B] shadow hover:bg-red-50"
                      >
                        <FaEdit size={13} /> Edit profile
                      </Link>
                    </div>
                    <dl className="grid gap-4 px-6 py-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div><dt className="text-xs font-semibold text-slate-400">Gender</dt><dd className="mt-1 font-semibold capitalize text-slate-800">{profile.gender}</dd></div>
                      <div><dt className="text-xs font-semibold text-slate-400">Age</dt><dd className="mt-1 font-semibold text-slate-800">{profile.age} years</dd></div>
                      <div><dt className="text-xs font-semibold text-slate-400">Location</dt><dd className="mt-1 font-semibold text-slate-800">{profile.city}, {profile.state}</dd></div>
                      <div><dt className="text-xs font-semibold text-slate-400">Last donation</dt><dd className="mt-1 font-semibold text-slate-800">{profile.last_donation_date ? fmtDay(profile.last_donation_date) : "Not added"}</dd></div>
                    </dl>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ===== DELETE CONFIRM ===== */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-xl text-red-600">
              <FaTrash />
            </div>
            <h2 id="delete-title" className="mt-4 text-lg font-bold text-slate-900">Delete this request?</h2>
            <p className="mt-1 text-sm text-slate-500">
              The request for {deleteTarget.patient_name} and all its responses will be removed. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                <FaTimes size={12} /> Cancel
              </button>
              <button
                type="button"
                disabled={busyId === deleteTarget.id}
                onClick={confirmDelete}
                className="flex-1 rounded-full bg-red-600 py-2.5 text-sm font-bold text-white shadow-md hover:bg-red-700 disabled:opacity-60"
              >
                {busyId === deleteTarget.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}