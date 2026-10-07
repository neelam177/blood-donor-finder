"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FiLogOut } from "react-icons/fi";
import { clearSession, getUser, type SessionUser } from "@/lib/session";

const HIDDEN_ON = ["/login", "/register"];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  // Har page change par login status dobara check karo
  useEffect(() => {
    setUser(getUser());
    setReady(true);
  }, [pathname]);

  function handleLogout() {
    clearSession();
    setUser(null);
    router.push("/");
    router.refresh();
  }

  // Helper function to check if link is active
  function isActive(path: string): boolean {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  }

  function getLinkClass(path: string): string {
    return isActive(path)
      ? "rounded-full px-3 py-2 bg-red-700 text-white font-semibold"
      : "rounded-full px-3 py-2 hover:bg-red-50 hover:text-red-700";
  }

  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-red-100 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt="BloodConnect logo"
            width={36}
            height={36}
          />
          <span className="text-xl font-extrabold text-red-800">
            Blood<span className="text-red-500">Connect</span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-1 text-sm font-medium text-gray-700 sm:gap-2">
          <Link href="/" className={getLinkClass("/")}>
            Home
          </Link>
          <Link href="/donors" className={getLinkClass("/donors")}>
            Find Donors
          </Link>
          <Link href="/requests" className={getLinkClass("/requests")}>
            Requests
          </Link>

          {/* Jab tak status check ho raha hai, kuch mat dikhao (flicker se bachne ke liye) */}
          {ready && !user && (
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-red-700 hover:bg-red-50"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-red-700 px-4 py-2 text-white shadow-sm hover:bg-red-800"
              >
                Register
              </Link>
            </>
          )}

          {ready && user && (
            <>
              <Link href="/dashboard" className={getLinkClass("/dashboard")}>
                Dashboard
              </Link>
              {/* <Link href="/dashboard/profile" className={navLink}>
                My Profile
              </Link> */}
              <span className="ml-1 flex items-center gap-2 rounded-full bg-red-50 py-1 pl-1 pr-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-red-700 text-sm font-bold text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[8rem] truncate text-red-800">
                  Hi, {user.name.split(" ")[0]}
                </span>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-full border border-red-700 px-4 py-2 text-red-700 hover:bg-red-50"
              >
                <FiLogOut size={16} />
                Logout
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
