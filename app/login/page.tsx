"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiArrowRight, FiEye, FiEyeOff } from "react-icons/fi";
import { FaEnvelope, FaHeart, FaLock } from "react-icons/fa";
import { getToken, saveSession, type SessionUser } from "@/lib/session";

const LEFT_IMAGE = "/image.png";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: SessionUser;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#D90F2B] focus:ring-4 focus:ring-red-100";
const labelClass = "mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800";
const errorClass = "mt-0.5 text-xs text-red-600";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/");
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const eErr = EMAIL_REGEX.test(email.trim()) ? "" : "Enter a valid email address";
    const pErr = password ? "" : "Enter your password";
    setEmailError(eErr);
    setPasswordError(pErr);
    setServerError("");
    if (eErr || pErr) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data: LoginResponse = await res.json();

      if (!res.ok || !data.success || !data.token || !data.user) {
        setServerError(data.message || "Login failed");
        return;
      }

      saveSession(data.token, data.user);
      const next = new URLSearchParams(window.location.search).get("next");
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      router.push(safeNext);
      router.refresh();
    } catch {
      setServerError("Cannot reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-rose-50 to-white p-0 sm:p-4 lg:h-dvh lg:overflow-hidden">
      <div className="grid w-full max-w-6xl overflow-hidden bg-white shadow-2xl sm:rounded-[2rem] lg:h-full lg:max-h-[780px] lg:grid-cols-[1fr_1fr]">
        {/* LEFT: IMAGE */}
        <section className="relative hidden lg:block">
          <Image
            src={LEFT_IMAGE}
            alt="BloodConnect: Be a hero, save lives"
            fill
            priority
            sizes="(min-width: 1024px) 560px, 0px"
            className="object-cover object-center"
          />
        </section>

        {/* RIGHT: FORM */}
        <section className="flex flex-col justify-center bg-white px-6 py-8 sm:px-10 lg:py-4">
          <div className="mb-5 flex items-center gap-2 lg:hidden">
            <Image src="/logo.svg" alt="BloodConnect logo" width={36} height={36} />
            <span className="text-xl font-extrabold text-slate-900">
              Blood<span className="text-[#D90F2B]">Connect</span>
            </span>
          </div>

          <p className="mb-6 text-right text-xs text-slate-500">
            New to BloodConnect?{" "}
            <Link
              href="/register"
              className="inline-flex items-center gap-1 font-semibold text-[#D90F2B] hover:underline"
            >
              Register <FiArrowRight />
            </Link>
          </p>

          <h2 className="text-3xl font-extrabold text-slate-900">Welcome back</h2>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500">
            Log in to search donors, post blood requests and respond to people
            who need help.
          </p>

          {serverError && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className={labelClass}>
                <FaEnvelope size={13} /> Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                  setServerError("");
                }}
                placeholder="you@example.com"
                className={inputClass}
              />
              {emailError && <p className={errorClass}>{emailError}</p>}
            </div>

            <div>
              <label htmlFor="password" className={labelClass}>
                <FaLock size={13} /> Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                    setServerError("");
                  }}
                  placeholder="Enter your password"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-4 text-slate-500 hover:text-slate-800"
                >
                  {showPassword ? <FiEye size={18} /> : <FiEyeOff size={18} />}
                </button>
              </div>
              {passwordError && <p className={errorClass}>{passwordError}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#D90F2B] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-[#B80C24] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log in"}
              {!loading && <FiArrowRight size={16} />}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <p className="flex items-center justify-center gap-2 rounded-lg bg-slate-50 py-2.5 text-xs text-slate-600">
            <FaHeart className="text-[#D90F2B]" size={12} />
            Don&apos;t have an account?
            <Link
              href="/register"
              className="inline-flex items-center gap-1 font-semibold text-[#D90F2B] hover:underline"
            >
              Register <FiArrowRight />
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}