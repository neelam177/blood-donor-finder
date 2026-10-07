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
  FaLock,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaSearch,
  FaTimes,
  FaUser,
} from "react-icons/fa";
import { getToken } from "@/lib/session";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const PER_PAGE = 9;

interface Donor {
  user_id: number;
  name: string;
  phone: string | null;
  blood_group: string;
  gender: string;
  age: number;
  city: string;
  state: string;
  last_donation_date: string | null;
}

interface DonorsResponse {
  success: boolean;
  message?: string;
  donors: Donor[];
  total: number;
  page: number;
  total_pages: number;
  logged_in: boolean;
}

function buildQuery(group: string, city: string, page: number, withLimit = false): string {
  const p = new URLSearchParams();
  if (group) p.set("blood_group", group); // + apne aap %2B ban jata hai
  if (city.trim()) p.set("city", city.trim());
  if (page > 1) p.set("page", String(page));
  if (withLimit) p.set("limit", String(PER_PAGE));
  return p.toString();
}

function formatDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function pageNumbers(current: number, total: number): number[] {
  const start = Math.max(1, Math.min(current - 2, total - 4));
  const end = Math.min(total, start + 4);
  const list: number[] = [];
  for (let i = start; i <= end; i++) list.push(i);
  return list;
}

function DonorsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlGroup = searchParams.get("blood_group") ?? "";
  const urlCity = searchParams.get("city") ?? "";
  const urlPage = Math.max(1, Math.floor(Number(searchParams.get("page"))) || 1);

  const [cityInput, setCityInput] = useState(urlCity);
  const [data, setData] = useState<DonorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // URL badle (jaise home page se aaye) to input bhi sync ho
  useEffect(() => {
    setCityInput(urlCity);
  }, [urlCity]);

  // URL ke filters se donors laao
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const token = getToken();
        const res = await fetch(
          `/api/donors?${buildQuery(urlGroup, urlCity, urlPage, true)}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        const json: DonorsResponse = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          setError(json.message || "Could not load donors");
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
  }, [urlGroup, urlCity, urlPage]);

  function go(group: string, city: string, page: number) {
    const q = buildQuery(group, city, page);
    router.push(q ? `/donors?${q}` : "/donors");
    if (page !== urlPage) window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    go(urlGroup, cityInput, 1);
  }

  const hasFilters = Boolean(urlGroup || urlCity);
  const donors = data?.donors ?? [];
  const loggedIn = data?.logged_in ?? false;

  return (
    <main className="min-h-screen bg-rose-50/60 pb-14">
      {/* ===== HEADER + SEARCH ===== */}
      <section className="bg-gradient-to-r from-[#B80C24] via-[#D90F2B] to-[#EE3A50] pb-16 pt-8 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Find a blood donor</h1>
          <p className="mt-2 max-w-xl text-sm text-red-50 sm:text-base">
            Search available donors by blood group and city. Only donors who are
            available and eligible to donate are shown.
          </p>
        </div>
      </section>

      <div className="mx-auto -mt-10 max-w-6xl px-4">
        {/* Search card */}
        <div className="rounded-3xl bg-white p-5 shadow-xl shadow-rose-100 ring-1 ring-rose-100 sm:p-6">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
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
                    go(urlGroup, "", 1);
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

          {/* Blood group pills */}
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-slate-500">Blood group</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => go("", cityInput, 1)}
                className={`rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${
                  !urlGroup
                    ? "border-[#D90F2B] bg-[#D90F2B] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-red-300"
                }`}
              >
                All
              </button>
              {BLOOD_GROUPS.map((g) => {
                const active = urlGroup === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => go(g, cityInput, 1)}
                    className={`min-w-[3.25rem] rounded-full border-2 px-4 py-1.5 text-sm font-bold transition ${
                      active
                        ? "border-[#D90F2B] bg-gradient-to-br from-[#E5233C] to-[#B80C24] text-white shadow-md shadow-red-200"
                        : "border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Result summary */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            {loading ? (
              "Searching..."
            ) : (
              <>
                <span className="font-bold text-slate-900">{data?.total ?? 0}</span>{" "}
                {(data?.total ?? 0) === 1 ? "donor" : "donors"} found
                {urlGroup && (
                  <>
                    {" "}
                    for <span className="font-semibold text-[#D90F2B]">{urlGroup}</span>
                  </>
                )}
                {urlCity && (
                  <>
                    {" "}
                    in <span className="font-semibold text-slate-900">{urlCity}</span>
                  </>
                )}
              </>
            )}
          </p>
          {hasFilters && !loading && (
            <button
              type="button"
              onClick={() => {
                setCityInput("");
                router.push("/donors");
              }}
              className="text-sm font-semibold text-[#D90F2B] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {!loading && data && !loggedIn && donors.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            <FaLock size={13} />
            Phone numbers are hidden for privacy.
            <Link href="/login" className="font-bold underline">
              Log in
            </Link>{" "}
            to contact donors.
          </div>
        )}

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* ===== CARDS ===== */}
        {loading ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-3xl bg-white ring-1 ring-rose-100" />
            ))}
          </div>
        ) : donors.length > 0 ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {donors.map((d) => (
              <article
                key={d.user_id}
                className="group overflow-hidden rounded-3xl bg-white shadow-md shadow-rose-100 ring-1 ring-rose-100 transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-center gap-4 bg-gradient-to-r from-rose-50 to-white px-5 py-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E5233C] to-[#B80C24] text-xl font-extrabold text-white shadow-lg shadow-red-200">
                    {d.blood_group}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold text-slate-900">{d.name}</h3>
                    <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                      <FaCheckCircle size={11} /> Available
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 px-5 py-4 text-sm text-slate-600">
                  <p className="flex items-center gap-2.5">
                    <FaMapMarkerAlt className="shrink-0 text-[#D90F2B]" />
                    {d.city}, {d.state}
                  </p>
                  <p className="flex items-center gap-2.5 capitalize">
                    <FaUser className="shrink-0 text-[#D90F2B]" />
                    {d.gender}, {d.age} years
                  </p>
                  <p className="flex items-center gap-2.5">
                    <FaCalendarAlt className="shrink-0 text-[#D90F2B]" />
                    {d.last_donation_date
                      ? `Last donated ${formatDate(d.last_donation_date)}`
                      : "Ready to donate"}
                  </p>
                </div>

                <div className="px-5 pb-5">
                  {d.phone ? (
                    <a
                      href={`tel:${d.phone}`}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#E5233C] to-[#B80C24] py-2.5 text-sm font-bold text-white shadow-md shadow-red-200 transition hover:brightness-110"
                    >
                      <FaPhoneAlt size={13} /> Call {d.phone}
                    </a>
                  ) : (
                    <Link
                      href="/login"
                      className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#D90F2B] py-2.5 text-sm font-bold text-[#D90F2B] transition hover:bg-red-50"
                    >
                      <FaLock size={12} /> Login to view contact
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          !error && (
            <div className="mt-5 flex flex-col items-center rounded-3xl bg-white px-6 py-12 text-center shadow-md shadow-rose-100 ring-1 ring-rose-100">
              <Image
                src="/empty-donors.svg"
                alt="No donors found"
                width={320}
                height={240}
                className="h-auto w-64"
              />
              <h2 className="mt-4 text-xl font-bold text-slate-900">No donors found</h2>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                No available donors match your search right now. Try a different
                blood group or city, or register as a donor yourself.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {hasFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setCityInput("");
                      router.push("/donors");
                    }}
                    className="rounded-full border-2 border-[#D90F2B] px-6 py-2.5 text-sm font-bold text-[#D90F2B] hover:bg-red-50"
                  >
                    Clear filters
                  </button>
                )}
                <Link
                  href="/dashboard/profile"
                  className="rounded-full bg-[#D90F2B] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-red-200 hover:bg-[#B80C24]"
                >
                  Register as donor
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
              onClick={() => go(urlGroup, urlCity, data.page - 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-red-300 hover:text-[#D90F2B] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <FaChevronLeft size={12} />
            </button>

            {pageNumbers(data.page, data.total_pages).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => go(urlGroup, urlCity, n)}
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
              onClick={() => go(urlGroup, urlCity, data.page + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-red-300 hover:text-[#D90F2B] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <FaChevronRight size={12} />
            </button>
          </nav>
        )}
      </div>
    </main>
  );
}

// useSearchParams ko Suspense me wrap karna zaroori hai (Next.js ka rule)
export default function DonorsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-rose-50/60" />}>
      <DonorsContent />
    </Suspense>
  );
}