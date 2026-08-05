import { NextRequest, NextResponse } from "next/server";
import { convex, convexAuthFns, hashValue } from "@/lib/server/auth";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "ksd_auth_session";

export async function GET(request: NextRequest) {
  try {
    const rawSessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!rawSessionToken) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const payload = await convex.query(convexAuthFns.getAuthSessionByHash, {
      session_hash: hashValue(rawSessionToken),
    }) as {
      session: {
        _id: string;
        expires_at: number;
      };
      user: {
        email: string;
        name?: string;
        role?: string;
      };
    } | null;

    if (!payload) {
      const response = NextResponse.json({ user: null }, { status: 200 });
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    return NextResponse.json(
      {
        user: {
          email: payload.user.email,
          name: payload.user.name || "Administrator",
          role: payload.user.role || "admin",
        },
        expiresAt: payload.session.expires_at,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load session.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
