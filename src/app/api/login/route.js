import { cookies } from "next/headers";
import { COOKIE, cookieOptions, createToken, passwordMatches } from "@/lib/auth";

export async function POST(request) {
  try {
    const { password } = await request.json();
    if (!passwordMatches(password)) {
      await new Promise((r) => setTimeout(r, 800)); // slow down guessing
      return Response.json({ error: "Wrong password" }, { status: 401 });
    }
    (await cookies()).set(COOKIE, createToken(), cookieOptions);
    return Response.json({ owner: true });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Login is not configured" }, { status: 500 });
  }
}
