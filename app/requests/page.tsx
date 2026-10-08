"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaHandHoldingHeart,
  FaHospital,
  FaLock,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaPlus,
  FaSearch,
  FaTimes,
  FaTint,
  FaUserPlus,
  FaUsers,
} from "react-icons/fa";
import { clearSession, getToken } from "@/lib/session";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const URGENCIES = ["critical", "urgent", "normal"] as const;
const PER_PAGE = 8;

type Urgency = (typeof URGENCIES)[number];

interface BloodRequest {
  id: number;
  requester_name: string;
  patient_name: string;
  blood_group: string;
  units_needed: number;
  hospital: string;
  city: string;
  contact_phone: string | null;
  urgency: Urgency;
  note: string | null;
  needed_by: string;
  responses_count: number;
  is_mine: boolean;
}

interface ListResponse {
  success: boolean;
  message?: string;
  requests: BloodRequest[];
  total: number;
  page: number;
  total_pages: number;
  logged_in: boolean;
}

interface RespondResponse {
  success: boolean;
  message: string;
  contact_phone?: string;
}

const URGENCY_STYLE: Record<Urgency, { strip: string; badge: string; label: string }> = {
  critical: { strip: "bg-red-600", badge: "bg-red-600 text-white", label: "Critical" },
  urgent: { strip: "bg-orange-500", badge: "bg-orange-100 text-orange-700", label: "Urgent" },
  normal: { strip: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700", label: "Normal" },
};

function buildQuery(
  group: string,
  city: string,
  urgency: string,
  page: number,
  withLimit = false
): string {
  const p = new URLSearchParams();
  if (group) p.set("blood_group", group);
  if (city.trim()) p.set("city", city.trim());
  if (urgency) p.set("urgency", urgency);
  if (page > 1) p.set("page", String(page));
  if (withLimit) p.set("limit", String(PER_PAGE));
  return p.toString();
}

function daysLeft(dateStr: string): string {
  const target = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff <= 0) return "Needed today";
  if (diff === 1) return "Needed tomorrow";
  return `Needed in ${diff} days`;
}

function pageNumbers(current: number, total: number): number[] {
  const start = Math.max(1, Math.min(current - 2, total - 4));
  const end = Math.min(total, start + 4);
  const list: number[] = [];
  for (let i = start; i <= end; i++) list.push(i);
  return list;
}

// Check if donor is eligible to donate (90 days after last donation)
function checkDonorEligibility(lastDonationDate: string | null): {
  eligible: boolean;
  nextDate: string | null;
  daysLeft: number;
} {
  if (!lastDonationDate) {
    return { eligible: true, nextDate: null, daysLeft: 0 };
  }

  const lastDate = new Date(`${lastDonationDate}T00:00:00`);
  const nextEligibleDate = new Date(lastDate);
  nextEligibleDate.setDate(nextEligibleDate.getDate() + 90);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const daysLeft = Math.ceil((nextEligibleDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysLeft <= 0) {
    return { eligible: true, nextDate: null, daysLeft: 0 };
  }
  
  return {
    eligible: false,
    nextDate: nextEligibleDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    daysLeft,
  };
}

function RequestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlGroup = searchParams.get("blood_group") ?? "";
  const urlCity = searchParams.get("city") ?? "";
  const urlUrgency = searchParams.get("urgency") ?? "";
  const urlPage = Math.max(1, Math.floor(Number(searchParams.get("page"))) || 1);

  const [cityInput, setCityInput] = useState(urlCity);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasDonorProfile, setHasDonorProfile] = useState<boolean | null>(null);
  const [donorEligibility, setDonorEligibility] = useState<{
    eligible: boolean;
    nextDate: string | null;
    daysLeft: number;
  } | null>(null);

  // Respond popup
  const [target, setTarget] = useState<BloodRequest | null>(null);
  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalDone, setModalDone] = useState<{ message: string; phone: string | null } | null>(null);
  const [responded, setResponded] = useState<number[]>([]);
  const [extraCounts, setExtraCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    setCityInput(urlCity);
  }, [urlCity]);

  // Check if user has donor profile
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setHasDonorProfile(null);
      setDonorEligibility(null);
      return;
    }
    
    async function checkProfile() {
      try {
        const res = await fetch("/api/donors/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: { success: boolean; profile?: { last_donation_date: string | null } | null } = await res.json();
          const hasProfile = data.success && data.profile !== null;
          setHasDonorProfile(hasProfile);
          
          // Check 90-day eligibility
          if (hasProfile && data.profile) {
            const eligibility = checkDonorEligibility(data.profile.last_donation_date);
            setDonorEligibility(eligibility);
          } else {
            setDonorEligibility(null);
          }
        } else {
          setHasDonorProfile(false);
          setDonorEligibility(null);
        }
      } catch {
        setHasDonorProfile(false);
        setDonorEligibility(null);
      }
    }
    
    checkProfile();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const token = getToken();
        const res = await fetch(
          `/api/requests?${buildQuery(urlGroup, urlCity, urlUrgency, urlPage, true)}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        const json: ListResponse = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setError(json.message || "Could not load requests");
          setData(null);
        } else {
          setData(json);
        }
      } catch {
        if (!cancelled) setError("Cannot reach the server. Check your connection and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [urlGroup, urlCity, urlUrgency, urlPage]);

  // Escape se popup band
  useEffect(() => {
    if (!target) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target]);

  function go(group: string, city: string, urgency: string, page: number) {
    const q = buildQuery(group, city, urgency, page);
    router.push(q ? `/requests?${q}` : "/requests");
    if (page !== urlPage) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearAll() {
    setCityInput("");
    router.push("/requests");
  }

  function openModal(r: BloodRequest) {
    setTarget(r);
    setMsg("");
    setModalError("");
    setModalDone(null);
  }

  function closeModal() {
    setTarget(null);
    setSubmitting(false);
  }

  async function confirmRespond() {
    if (!target) return;
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    setSubmitting(true);
    setModalError("");
    try {
      const res = await fetch(`/api/requests/${target.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: msg }),
      });
      if (res.status === 401) {
        clearSession();
        router.push("/login");
        return;
      }
      const json: RespondResponse = await res.json();
      if (res.status === 409 && json.message.includes("already responded")) {
        setResponded((prev) => (prev.includes(target.id) ? prev : [...prev, target.id]));
      }
      if (!res.ok || !json.success) {
        setModalError(json.message || "Could not send response");
        return;
      }
      setResponded((prev) => [...prev, target.id]);
      setExtraCounts((prev) => ({ ...prev, [target.id]: (prev[target.id] ?? 0) + 1 }));
      setModalDone({ message: json.message, phone: json.contact_phone ?? null });
    } catch {
      setModalError("Cannot reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const hasFilters = Boolean(urlGroup || urlCity || urlUrgency);
  const requests = data?.requests ?? [];
  const loggedIn = data?.logged_in ?? false;

  return (
    <main className="min-h-screen bg-rose-50/60 pb-14">
      {/* ===== HEADER ===== */}
      <section className="bg-gradient-to-r from-[#B80C24] via-[#D90F2B] to-[#EE3A50] pb-16 pt-8 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4">
          <div>
            <h1 className="text-3xl font-extrabold sm:text-4xl">Blood requests</h1>
            <p className="mt-2 max-w-xl text-sm text-red-50 sm:text-base">
              People who need blood right now. Most urgent requests are shown first.
            </p>
          </div>
          <Link
            href="/requests/new"
            className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#D90F2B] shadow-lg transition hover:bg-red-50"
          >
            <FaPlus size={13} /> Request blood
          </Link>
        </div>
      </section>

      <div className="mx-auto -mt-10 max-w-6xl px-4">
        {/* ===== FILTERS ===== */}
        <div className="rounded-3xl bg-white p-5 shadow-xl shadow-rose-100 ring-1 ring-rose-100 sm:p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              go(urlGroup, cityInput, urlUrgency, 1);
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <FaMapMarkerAlt
                size={15}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#D90F2B]/70"
              />
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Enter city (e.g. Vapi)"
                aria-label="City"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-3 pl-11 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#D90F2B] focus:bg-white focus:ring-4 focus:ring-red-100"
              />
              {cityInput && (
                <button
                  type="button"
                  aria-label="Clear city"
                  onClick={() => {
                    setCityInput("");
                    go(urlGroup, "", urlUrgency, 1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <FaTimes size={13} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E5233C] to-[#B80C24] px-8 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:brightness-110"
            >
              <FaSearch size={14} /> Search
            </button>
          </form>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">Blood group</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => go("", cityInput, urlUrgency, 1)}
                  className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${
                    !urlGroup
                      ? "border-[#D90F2B] bg-[#D90F2B] text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-red-300"
                  }`}
                >
                  All
                </button>
                {BLOOD_GROUPS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => go(g, cityInput, urlUrgency, 1)}
                    className={`min-w-[3.25rem] rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${
                      urlGroup === g
                        ? "border-[#D90F2B] bg-gradient-to-br from-[#E5233C] to-[#B80C24] text-white shadow-md shadow-red-200"
                        : "border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">Urgency</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => go(urlGroup, cityInput, "", 1)}
                  className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${
                    !urlUrgency
                      ? "border-slate-800 bg-slate-800 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  All
                </button>
                {URGENCIES.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => go(urlGroup, cityInput, u, 1)}
                    className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold capitalize transition ${
                      urlUrgency === u
                        ? `border-transparent ${URGENCY_STYLE[u].badge}`
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-400"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            {loading ? (
              "Loading requests..."
            ) : (
              <>
                <span className="font-bold text-slate-900">{data?.total ?? 0}</span> open{" "}
                {(data?.total ?? 0) === 1 ? "request" : "requests"}
              </>
            )}
          </p>
          {hasFilters && !loading && (
            <button
              type="button"
              onClick={clearAll}
              className="text-sm font-semibold text-[#D90F2B] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* ===== CARDS ===== */}
        {loading ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-3xl bg-white ring-1 ring-rose-100" />
            ))}
          </div>
        ) : requests.length > 0 ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {requests.map((r) => {
              const st = URGENCY_STYLE[r.urgency];
              const didRespond = responded.includes(r.id);
              const count = r.responses_count + (extraCounts[r.id] ?? 0);
              return (
                <article
                  key={r.id}
                  className="flex overflow-hidden rounded-3xl bg-white shadow-md shadow-rose-100 ring-1 ring-rose-100 transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className={`w-2 shrink-0 ${st.strip}`} aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E5233C] to-[#B80C24] text-xl font-extrabold text-white shadow-lg shadow-red-200">
                        {r.blood_group}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-lg font-bold text-slate-900">
                            {r.patient_name}
                          </h3>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.badge}`}>
                            {st.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Posted by {r.is_mine ? "you" : r.requester_name}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <p className="flex items-center gap-2">
                        <FaHospital className="shrink-0 text-[#D90F2B]" />
                        <span className="truncate">{r.hospital}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <FaMapMarkerAlt className="shrink-0 text-[#D90F2B]" />
                        {r.city}
                      </p>
                      <p className="flex items-center gap-2">
                        <FaTint className="shrink-0 text-[#D90F2B]" />
                        {r.units_needed} {r.units_needed === 1 ? "unit" : "units"} needed
                      </p>
                      <p className="flex items-center gap-2">
                        <FaCalendarAlt className="shrink-0 text-[#D90F2B]" />
                        {daysLeft(r.needed_by)}
                      </p>
                    </div>

                    {r.note && (
                      <p className="mt-3 line-clamp-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-slate-600">
                        {r.note}
                      </p>
                    )}

                    <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <FaUsers /> {count} {count === 1 ? "response" : "responses"}
                      </span>

                      <div className="ml-auto flex flex-wrap gap-2">
                        {r.is_mine ? (
                          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
                            Your request
                          </span>
                        ) : !loggedIn ? (
                          <Link
                            href="/login"
                            className="flex items-center gap-2 rounded-full border-2 border-[#D90F2B] px-5 py-2 text-sm font-bold text-[#D90F2B] transition hover:bg-red-50"
                          >
                            <FaLock size={12} /> Login to respond
                          </Link>
                        ) : hasDonorProfile === false ? (
                          <Link
                            href="/dashboard/profile"
                            className="flex items-center gap-2 rounded-full border-2 border-amber-500 bg-amber-50 px-5 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
                          >
                            <FaUserPlus size={12} /> Create donor profile
                          </Link>
                        ) : donorEligibility && !donorEligibility.eligible ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="flex items-center gap-2 rounded-full border-2 border-amber-400 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                              <FaClock size={11} /> Not eligible yet
                            </span>
                            <span className="text-xs text-slate-500">
                              Can donate from {donorEligibility.nextDate}
                            </span>
                          </div>
                        ) : (
                          <>
                            {r.contact_phone && (
                              <a
                                href={`tel:${r.contact_phone}`}
                                className="flex items-center gap-2 rounded-full border-2 border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-[#D90F2B]"
                              >
                                <FaPhoneAlt size={12} /> Call
                              </a>
                            )}
                            {didRespond ? (
                              <span className="flex items-center gap-2 rounded-full bg-green-50 px-5 py-2 text-sm font-bold text-green-700">
                                <FaCheckCircle /> Responded
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openModal(r)}
                                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#E5233C] to-[#B80C24] px-5 py-2 text-sm font-bold text-white shadow-md shadow-red-200 transition hover:brightness-110"
                              >
                                <FaHandHoldingHeart /> I can donate
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          !error && (
            <div className="mt-5 flex flex-col items-center rounded-3xl bg-white px-6 py-12 text-center shadow-md shadow-rose-100 ring-1 ring-rose-100">
              <Image src="/empty-donors.svg" alt="No requests found" width={320} height={240} className="h-auto w-64" />
              <h2 className="mt-4 text-xl font-bold text-slate-900">No open requests</h2>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                There are no open requests matching your search. Try different filters, or request blood if you need it.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="rounded-full border-2 border-[#D90F2B] px-6 py-2.5 text-sm font-bold text-[#D90F2B] hover:bg-red-50"
                  >
                    Clear filters
                  </button>
                )}
                <Link
                  href="/requests/new"
                  className="rounded-full bg-[#D90F2B] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-200 hover:bg-[#B80C24]"
                >
                  Request blood
                </Link>
              </div>
            </div>
          )
        )}

        {/* ===== PAGINATION ===== */}
        {!loading && data && data.total_pages > 1 && (
          <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={data.page <= 1}
              onClick={() => go(urlGroup, urlCity, urlUrgency, data.page - 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-red-300 hover:text-[#D90F2B] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <FaChevronLeft size={12} />
            </button>
            {pageNumbers(data.page, data.total_pages).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => go(urlGroup, urlCity, urlUrgency, n)}
                aria-current={n === data.page ? "page" : undefined}
                className={`h-10 w-10 rounded-full text-sm font-bold transition ${
                  n === data.page
                    ? "bg-[#D90F2B] text-white shadow-md shadow-red-200"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:text-[#D90F2B]"
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={data.page >= data.total_pages}
              onClick={() => go(urlGroup, urlCity, urlUrgency, data.page + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-red-300 hover:text-[#D90F2B] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <FaChevronRight size={12} />
            </button>
          </nav>
        )}
      </div>

      {/* ===== RESPOND POPUP ===== */}
      {target && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="respond-title"
            className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 bg-gradient-to-r from-[#B80C24] to-[#E5233C] px-6 py-5 text-white">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-lg font-extrabold text-[#D90F2B]">
                {target.blood_group}
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="respond-title" className="truncate text-lg font-bold">
                  Help {target.patient_name}
                </h2>
                <p className="truncate text-xs text-red-100">
                  {target.hospital}, {target.city}
                </p>
              </div>
              <button type="button" aria-label="Close" onClick={closeModal} className="text-white/80 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="px-6 py-5">
              {modalDone ? (
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600">
                    <FaCheckCircle />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-800">{modalDone.message}</p>
                  {modalDone.phone && (
                    <a
                      href={`tel:${modalDone.phone}`}
                      className="mt-4 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E5233C] to-[#B80C24] py-3 text-sm font-bold text-white shadow-md shadow-red-200"
                    >
                      <FaPhoneAlt size={13} /> Call {modalDone.phone}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={closeModal}
                    className="mt-3 w-full rounded-full border-2 border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600">
                    The requester will see your name and phone number. You can add a short message (optional).
                  </p>
                  <label htmlFor="resp-msg" className="mt-4 mb-1.5 block text-xs font-semibold text-slate-600">
                    Message
                  </label>
                  <textarea
                    id="resp-msg"
                    rows={3}
                    maxLength={255}
                    value={msg}
                    onChange={(e) => {
                      setMsg(e.target.value);
                      setModalError("");
                    }}
                    placeholder="e.g. I can reach the hospital by 5 PM"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#D90F2B] focus:bg-white focus:ring-4 focus:ring-red-100"
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">{msg.length}/255</p>

                  {modalError && (
                    <div role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
                      {modalError}
                    </div>
                  )}

                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 rounded-full border-2 border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={confirmRespond}
                      className="flex-1 rounded-full bg-gradient-to-r from-[#E5233C] to-[#B80C24] py-2.5 text-sm font-bold text-white shadow-md shadow-red-200 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? "Sending..." : "Confirm"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function RequestsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-rose-50/60" />}>
      <RequestsContent />
    </Suspense>
  );
}