import {
  convex,
  convexAuthFns,
  createRandomToken,
  generateOtpCode,
  getBaseUrl,
  hashPassword,
  hashValue,
  maskEmail,
  normalizeEmail,
  sendAuthEmail,
  verifyPassword,
} from "@/lib/server/auth";

export type AuthUser = {
  _id: string;
  email: string;
  password_hash: string;
  name?: string;
  role?: string;
  is_active?: boolean;
};

function buildOtpEmailHtml(otpCode: string, deliveryEmail: string, validityLabel: string): string {
  const logoSrc = "https://www.ksdentalclinics.com/dental_logo.webp";
  const digitBoxStyle =
    "display:inline-block;width:52px;height:62px;line-height:62px;" +
    "background:#ffffff;border:1.5px solid rgba(0,119,182,0.18);border-radius:12px;" +
    "font-family:Georgia,serif;font-size:30px;font-weight:700;color:#023E8A;" +
    "text-align:center;box-shadow:0 4px 12px rgba(2,62,138,0.08);margin:0 4px;";

  const digitBoxes = otpCode
    .split("")
    .map((digit) => `<span style="${digitBoxStyle}">${digit}</span>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Shahi Dental Admin OTP</title>
</head>
<body style="margin:0;padding:40px 20px;background:#e8f4fd;font-family:Arial,sans-serif;">

  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 16px 48px rgba(2,62,138,0.14);">

    <div style="height:5px;background:linear-gradient(90deg,#00C9A7,#00B4D8,#0077B6);"></div>

    <div style="background:linear-gradient(150deg,#023E8A 0%,#0077B6 60%,#0096C7 100%);padding:36px 48px;text-align:center;">
      <img
        src="${logoSrc}"
        alt="Shahi Dental Clinic"
        width="130"
        height="auto"
        style="display:block;margin:0 auto 16px;max-width:130px;height:auto;"
      />
      <p style="margin:0 0 10px;font-size:11px;color:rgba(255,255,255,0.88);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">
        Secure Access
      </p>
      <p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.62);letter-spacing:0.1em;text-transform:uppercase;font-weight:500;">
        Shahi Dental Clinic
      </p>
      <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.6);letter-spacing:0.1em;text-transform:uppercase;font-weight:500;">
        Admin Portal - Secure Login
      </p>
    </div>

    <div style="padding:40px 48px;">
      <p style="margin:0 0 6px;font-size:12px;color:#6b8299;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;">
        One-Time Password
      </p>
      <h2 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a2e44;font-weight:700;">
        Your login OTP is ready
      </h2>

      <p style="margin:0 0 28px;font-size:14.5px;color:#4a6070;line-height:1.7;">
        Someone (hopefully you) requested access to the Shahi Dental Clinic admin dashboard.
        Use the code below to complete your sign-in.
        <strong>Do not share this code with anyone.</strong>
      </p>

      <div style="text-align:center;margin:0 0 28px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#F0F7FF 0%,#e0f0ff 100%);border:1.5px solid rgba(0,119,182,0.15);border-radius:16px;padding:28px 40px;">
          <p style="margin:0 0 14px;font-size:11px;color:#6b8299;letter-spacing:0.12em;text-transform:uppercase;">Your OTP Code</p>
          <div style="white-space:nowrap;">${digitBoxes}</div>
          <p style="margin:14px 0 0;font-size:12px;color:#6b8299;">
            Valid for <strong style="color:#0077B6;">${validityLabel}</strong>
          </p>
        </div>
      </div>

      <div style="background:#fff8f0;border:1px solid rgba(255,150,50,0.2);border-left:3px solid #f0933a;border-radius:10px;padding:14px 18px;margin-bottom:28px;">
        <p style="margin:0;font-size:13px;color:#8a5a2a;line-height:1.6;">
          <strong>Never share this OTP.</strong> Shahi Dental Clinic staff will never ask you for this code.
          If you did not request this, please ignore this email - your account remains secure.
        </p>
      </div>

      <div style="height:1px;background:linear-gradient(90deg,transparent,rgba(0,119,182,0.12),transparent);margin:0 0 24px;"></div>

      <p style="margin:0;font-size:13px;color:#6b8299;line-height:1.7;">
        This OTP was sent to <strong>${deliveryEmail}</strong>.
        This is an automated message - please do not reply.
      </p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(90deg,#f7fbff,#f0f7ff);border-top:1px solid rgba(0,119,182,0.08);">
      <tr>
        <td style="padding:18px 48px;font-size:11.5px;color:#afc5d9;">Developed by Nityom Tikhe</td>
        <td style="padding:18px 48px;font-size:11.5px;color:#afc5d9;text-align:right;">© 2026 Shahi Dental Clinic</td>
      </tr>
    </table>

    <div style="height:3px;background:linear-gradient(90deg,#00C9A7,#0077B6);"></div>

  </div>
</body>
</html>`;
}

function getBootstrapAdmin() {
  const email = process.env.AUTH_LOGIN_EMAIL;
  const password = process.env.AUTH_LOGIN_PASSWORD;

  if (!email || !password) {
    return null;
  }

  return {
    email: normalizeEmail(email),
    password,
    name: process.env.AUTH_BOOTSTRAP_NAME || "Administrator",
  };
}

function getAuthDeliveryEmail(defaultEmail: string): string {
  const overrideEmail = process.env.AUTH_OTP_TO_EMAIL;
  return normalizeEmail(overrideEmail || defaultEmail);
}

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  return await convex.query(convexAuthFns.getUserByEmail, { email: normalizeEmail(email) }) as AuthUser | null;
}

export async function getUserForLogin(email: string, password: string): Promise<AuthUser | null> {
  const normalizedEmail = normalizeEmail(email);
  const bootstrap = getBootstrapAdmin();

  // Restrict authentication to configured admin email only.
  if (!bootstrap || normalizedEmail !== bootstrap.email) {
    return null;
  }

  let user = await findUserByEmail(normalizedEmail);

  if (!user) {
    if (password === bootstrap.password) {
      const passwordHash = await hashPassword(password);
      await convex.mutation(convexAuthFns.createUser, {
        email: normalizedEmail,
        password_hash: passwordHash,
        name: bootstrap.name,
        role: "admin",
      });
      user = await findUserByEmail(normalizedEmail);
    }
  }

  if (!user || user.is_active === false) {
    return null;
  }

  const isPasswordValid = await verifyPassword(password, user.password_hash);
  if (!isPasswordValid) {
    return null;
  }

  if (!user.password_hash.startsWith("$2")) {
    const updatedHash = await hashPassword(password);
    await convex.mutation(convexAuthFns.updateUserPassword, {
      userId: user._id as any,
      password_hash: updatedHash,
    });
  }

  return user;
}

export async function issueLoginOtp(user: AuthUser) {
  const otp = generateOtpCode(4);
  const otpValidityMinutes = 5;
  const expiresAt = Date.now() + otpValidityMinutes * 60 * 1000;
  const deliveryEmail = getAuthDeliveryEmail(user.email);

  const otpSessionId = await convex.mutation(convexAuthFns.createOtpSession, {
    userId: user._id as any,
    email: normalizeEmail(user.email),
    otp_hash: hashValue(otp),
    expires_at: expiresAt,
  });

  await sendAuthEmail({
    to: deliveryEmail,
    subject: "Shahi Dental Clinic Admin Login OTP",
    text: `Your 4-digit OTP is ${otp}. It is valid for ${otpValidityMinutes} minutes.`,
    html: buildOtpEmailHtml(otp, deliveryEmail, `${otpValidityMinutes} minutes`),
  });

  return {
    otpSessionId,
    deliveryEmail: maskEmail(deliveryEmail),
    expiresAt,
    message: "OTP sent to your email.",
  };
}

export async function createAndStoreSession(userId: string) {
  const rawSessionToken = createRandomToken();
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

  await convex.mutation(convexAuthFns.createAuthSession, {
    userId: userId as any,
    session_hash: hashValue(rawSessionToken),
    expires_at: expiresAt,
  });

  return { rawSessionToken, expiresAt };
}

export async function issuePasswordReset(email: string) {
  const user = await findUserByEmail(email);
  if (!user || user.is_active === false) {
    return;
  }
  const deliveryEmail = getAuthDeliveryEmail(user.email);

  const rawResetToken = createRandomToken();
  const resetTokenHash = hashValue(rawResetToken);
  const expiresAt = Date.now() + 30 * 60 * 1000;

  await convex.mutation(convexAuthFns.createPasswordResetToken, {
    userId: user._id as any,
    email: user.email,
    token_hash: resetTokenHash,
    expires_at: expiresAt,
  });

  const resetLink = `${getBaseUrl()}/auth/reset_password?token=${encodeURIComponent(rawResetToken)}`;

  await sendAuthEmail({
    to: deliveryEmail,
    subject: "Reset your Shahi Dental password",
    text: `Reset your password using this link: ${resetLink}. This link expires in 30 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a;">
        <h2 style="margin-bottom: 8px;">Reset your password</h2>
        <p style="margin-top: 0;">Click the button below to set a new password. The link expires in 30 minutes.</p>
        <p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 16px; border-radius: 6px; background: #0ea5e9; color: #ffffff; text-decoration: none; font-weight: 600;">
            Reset Password
          </a>
        </p>
        <p style="word-break: break-all; font-size: 12px; color: #334155;">${resetLink}</p>
        <p style="font-size: 12px; color: #64748b;">If you did not request this, ignore this email.</p>
      </div>
    `,
  });
}
