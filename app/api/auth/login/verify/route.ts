import { NextRequest, NextResponse } from "next/server";
import { convex, convexAuthFns, hashValue, normalizeEmail } from "@/lib/server/auth";
import { createAndStoreSession } from "@/lib/server/auth-flow";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "ksd_auth_session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim();
    const otp = String(body?.otp || "").trim();
    const otpSessionId = String(body?.otpSessionId || "").trim();

    if (!email || !otp || !otpSessionId) {
      return NextResponse.json({ message: "Email, OTP and OTP session are required." }, { status: 400 });
    }

    if (!/^\d{4}$/.test(otp)) {
      return NextResponse.json({ message: "OTP must be a 4 digit code." }, { status: 400 });
    }

    const payload = await convex.query(convexAuthFns.getOtpSessionById, {
      sessionId: otpSessionId as any,
      email: normalizeEmail(email),
    }) as {
      session: {
        _id: string;
        otp_hash: string;
        used: boolean;
        expires_at: number;
        attempts: number;
        max_attempts: number;
        user_id: string;
      };
      user: {
        _id: string;
        email: string;
        name?: string;
        role?: string;
      } | null;
    } | null;

    if (!payload || !payload.user) {
      return NextResponse.json({ message: "Invalid OTP session." }, { status: 401 });
    }

    if (payload.session.used || payload.session.expires_at < Date.now()) {
      return NextResponse.json({ message: "OTP expired. Please request a new one." }, { status: 401 });
    }

    const incomingHash = hashValue(otp);
    if (incomingHash !== payload.session.otp_hash) {
      const attemptState = await convex.mutation(convexAuthFns.registerOtpAttempt, {
        sessionId: payload.session._id as any,
      }) as { locked: boolean; attempts: number; maxAttempts: number };

      if (attemptState.locked) {
        return NextResponse.json({ message: "Too many invalid attempts. Request a new OTP." }, { status: 429 });
      }

      return NextResponse.json(
        { message: `Invalid OTP. Attempts left: ${Math.max(attemptState.maxAttempts - attemptState.attempts, 0)}` },
        { status: 401 }
      );
    }

    await convex.mutation(convexAuthFns.consumeOtpSession, {
      sessionId: payload.session._id as any,
    });

    await convex.mutation(convexAuthFns.touchUserLogin, {
      userId: payload.user._id as any,
    });

    const userRole = payload.user.role || "admin";
    const { rawSessionToken, expiresAt } = await createAndStoreSession(payload.user._id, userRole);

    const response = NextResponse.json(
      {
        success: true,
        user: {
          email: payload.user.email,
          name: payload.user.name || (userRole === "admin" ? "Administrator" : "Staff"),
          role: userRole,
        },
      },
      { status: 200 }
    );

    const isAdmin = userRole === "admin";
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: rawSessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(expiresAt),
      maxAge: isAdmin ? 365 * 24 * 60 * 60 : 10 * 60 * 60,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify OTP.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
