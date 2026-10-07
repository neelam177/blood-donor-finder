import jwt from "jsonwebtoken";

export interface AuthUser {
  id: number;
  role: "user" | "admin";
}

// Request ke header se token nikal ke verify karta hai.
// Sahi ho to user ka {id, role} return karta hai, warna null.
export function getAuthUser(request: Request): AuthUser | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;

  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;

  const token = header.slice(7);

  try {
    const decoded = jwt.verify(token, secret);
    if (
      typeof decoded === "object" &&
      typeof decoded.id === "number" &&
      (decoded.role === "user" || decoded.role === "admin")
    ) {
      return { id: decoded.id, role: decoded.role };
    }
    return null;
  } catch {
    // token galat ya expire
    return null;
  }
}