export interface SessionUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: "user" | "admin";
}

const TOKEN_KEY = "bc_token";
const USER_KEY = "bc_user";

export function saveSession(token: string, user: SessionUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}


const VISITED_KEY = "bc_visited";

export function hasVisited(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(VISITED_KEY) === "1";
}

export function markVisited(): void {
  localStorage.setItem(VISITED_KEY, "1");
}
