"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiArrowRight, FiEye, FiEyeOff } from "react-icons/fi";
import { FaEnvelope, FaHeart, FaLock, FaPhoneAlt, FaUser } from "react-icons/fa";
import { getToken, saveSession, type SessionUser } from "@/lib/session";

const LEFT_IMAGE = "/image.png";

interface FormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (form.name.trim().length < 2) errors.name = "Enter your full name (at least 2 letters)";
  if (!EMAIL_REGEX.test(form.email.trim())) errors.email = "Enter a valid email address";
  if (!/^[0-9]{10}$/.test(form.phone.trim())) errors.phone = "Phone must be exactly 10 digits";
  if (
    form.password.length < 8 ||
    !/[A-Za-z]/.test(form.password) ||
    !/[0-9]/.test(form.password)
  )
    errors.password = "Use 8+ characters with at least one letter and one number";
  if (form.confirmPassword !== form.password)
    errors.confirmPassword = "Passwords do not match";
  return errors;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#D90F2B] focus:ring-4 focus:ring-red-100";
const labelClass = "mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800";
const errorClass = "mt-0.5 text-xs text-red-600";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace("/");
  }, [router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    setServerError("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    setServerError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
        }),
      });

      const data: { success: boolean; message: string } = await res.json();

      if (!res.ok || !data.success) {
        setServerError(data.message || "Registration failed");
        return;
      }

      // Auto-login after successful registration
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const loginData: { success: boolean; token?: string; user?: SessionUser } = await loginRes.json();
      setSuccess(true);

      if (loginRes.ok && loginData.success && loginData.token && loginData.user) {
        saveSession(loginData.token, loginData.user);
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 1200);
      } else {
        setTimeout(() => router.push("/login"), 1500);
      }
    } catch {
      setServerError("Cannot reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-50 to-white p-0 sm:p-6 lg:py-8">
      <div className="grid w-full max-w-6xl overflow-hidden bg-white shadow-2xl sm:rounded-[2rem] lg:grid-cols-[1fr_1fr]">
        {/* ===== LEFT: IMAGE ===== */}
        <section className="relative hidden min-h-[700px] lg:block">
          <Image
            src={LEFT_IMAGE}
            alt="BloodConnect: Be a hero, save lives"
            fill
            priority
            sizes="(min-width: 1024px) 500px, 0px"
            className="object-cover object-center"
          />
        </section>

        {/* ===== RIGHT: FORM ===== */}
        <section className="flex flex-col justify-center bg-white px-6 py-8 sm:px-10 lg:py-4">
          {/* Mobile logo (left image mobile par hide hoti hai) */}
          <div className="mb-5 flex items-center gap-2 lg:hidden">
            <Image src="/logo.svg" alt="BloodConnect logo" width={36} height={36} />
            <span className="text-xl font-extrabold text-slate-900">
              Blood<span className="text-[#D90F2B]">Connect</span>
            </span>
          </div>

          <p className="mb-3 text-right text-xs text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="inline-flex items-center gap-1 font-semibold text-[#D90F2B] hover:underline"
            >
              Log in <FiArrowRight />
            </Link>
          </p>

          <h2 className="text-3xl font-extrabold text-slate-900">Create your account</h2>
          <p className="mt-1.5 max-w-sm text-sm text-slate-500 [@media(max-height:760px)]:hidden">
            Join us in making a difference. Register now to donate blood or
            request blood when you need it.
          </p>

          {success && (
            <div
              role="status"
              className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800"
            >
              Account created. Signing you in...
            </div>
          )}
          {serverError && (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3">
            {/* Full name */}
            <div>
              <label htmlFor="name" className={labelClass}>
                <FaUser size={13} /> Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={inputClass}
              />
              {errors.name && <p className={errorClass}>{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className={labelClass}>
                <FaEnvelope size={13} /> Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className={inputClass}
              />
              {errors.email && <p className={errorClass}>{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className={labelClass}>
                <FaPhoneAlt size={13} /> Phone number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                autoComplete="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="10 digit mobile number"
                className={inputClass}
              />
              {errors.phone && <p className={errorClass}>{errors.phone}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className={labelClass}>
                <FaLock size={13} /> Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="At least 8 characters"
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
              {errors.password && <p className={errorClass}>{errors.password}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirmPassword" className={labelClass}>
                <FaLock size={13} /> Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Type the password again"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute inset-y-0 right-4 text-slate-500 hover:text-slate-800"
                >
                  {showConfirm ? <FiEye size={18} /> : <FiEyeOff size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className={errorClass}>{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#D90F2B] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-200 transition hover:bg-[#B80C24] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}
              {!loading && <FiArrowRight size={16} />}
            </button>
          </form>

          {/* or + login box (chhoti height par hide) */}
          <div className="[@media(max-height:700px)]:hidden">
            <div className="my-3 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              or
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <p className="flex items-center justify-center gap-2 rounded-lg bg-slate-50 py-2.5 text-xs text-slate-600">
              <FaHeart className="text-[#D90F2B]" size={12} />
              Already have an account?
              <Link
                href="/login"
                className="inline-flex items-center gap-1 font-semibold text-[#D90F2B] hover:underline"
              >
                Log in <FiArrowRight />
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}