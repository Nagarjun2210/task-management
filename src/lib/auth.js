import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE = "owner_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET missing or too short");
  return s;
}

const sign = (value) =>
  createHmac("sha256", secret()).update(value).digest("base64url");

function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function passwordMatches(input) {
  const expected = process.env.OWNER_PASSWORD;
  if (!expected) throw new Error("OWNER_PASSWORD is not set");
  // compare HMACs so length differences don't leak
  return safeEqual(sign("pw:" + String(input)), sign("pw:" + expected));
}

export function createToken() {
  const exp = String(Date.now() + MAX_AGE * 1000);
  return `${exp}.${sign(exp)}`;
}

export function verifyToken(token) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  if (!safeEqual(sig, sign(exp))) return false;
  return Number(exp) > Date.now();
}

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: MAX_AGE,
};

/** True when the request carries a valid owner session cookie. */
export async function isOwner() {
  try {
    const store = await cookies();
    return verifyToken(store.get(COOKIE)?.value);
  } catch {
    return false; // missing SESSION_SECRET etc. -> nobody is owner
  }
}

export const forbidden = () =>
  Response.json({ error: "Owner login required" }, { status: 403 });
