"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getToken, hasVisited, markVisited } from "@/lib/session";

// New visitor (no token, never visited) -> /register. Otherwise do nothing.
export default function FirstVisitRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) {
      markVisited();
      return;
    }
    if (!hasVisited()) {
      markVisited();
      router.replace("/register");
    }
  }, [router]);

  return null;
}
