import fs from "fs";
import path from "path";
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

function getEmailAttachments() {
  const logoPath = path.join(process.cwd(), "public", "Svaasth_logo.png");
  if (fs.existsSync(logoPath)) {
    return [
      {
        filename: "Svaasth_logo.png",
        path: logoPath,
        cid: "svaasth_logo",
      },
    ];
  }
  return [];
}

function buildOtpEmailHtml(otpCode: string, deliveryEmail: string, validityLabel: string, portalLabel: string): string {
  const digitBoxStyle =
    "display:inline-block;width:52px;height:60px;line-height:60px;" +
    "background:#ffffff;border:1.5px solid #176e56;border-radius:10px;" +
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:32px;font-weight:700;color:#176e56;" +
    "text-align:center;box-shadow:0 2px 8px rgba(23,110,86,0.1);margin:0 4px;";

  const digitBoxes = otpCode
    .split("")
    .map((digit) => `<span style="${digitBoxStyle}">${digit}</span>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Shahi Dental Clinic OTP</title>
</head>
<body style="margin:0;padding:40px 16px;background:#f4f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2eae3;box-shadow:0 12px 36px rgba(15,23,42,0.07);">

    <!-- Top green gradient strip -->
    <div style="height:5px;background:linear-gradient(90deg,#0d382c 0%,#176e56 50%,#369568 100%);"></div>

    <!-- Header -->
    <div style="background:linear-gradient(150deg,#0d382c 0%,#176e56 60%,#1f8569 100%);padding:36px 32px 32px;text-align:center;">
      <div style="display:inline-block;background:#ffffff;border-radius:12px;padding:8px 18px;margin:0 0 16px;box-shadow:0 4px 14px rgba(0,0,0,0.1);">
        <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td style="vertical-align:middle;padding-right:10px;">
              <img
                src="cid:svaasth_logo"
                alt="Svaasth"
                width="34"
                height="44"
                style="display:block;width:34px;height:44px;object-fit:contain;"
              />
            </td>
            <td style="vertical-align:middle;text-align:left;">
              <div style="font-size:16px;font-weight:800;color:#176e56;letter-spacing:0.08em;line-height:1.2;">SVAASTH</div>
              <div style="font-size:9.5px;font-weight:600;color:#64748b;letter-spacing:0.12em;text-transform:uppercase;">HMS Portal</div>
            </td>
          </tr>
        </table>
      </div>
      <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.82);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">
        Secure Access
      </p>
      <p style="margin:0 0 4px;font-size:14px;color:#ffffff;letter-spacing:0.04em;font-weight:600;">
        Shahi Dental Clinic
      </p>
      <p style="margin:0;font-size:11.5px;color:rgba(255,255,255,0.72);letter-spacing:0.08em;text-transform:uppercase;font-weight:500;">
        ${portalLabel} Portal • Secure Login
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding:36px 36px 28px;">
      <p style="margin:0 0 6px;font-size:11px;color:#176e56;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;">
        One-Time Password
      </p>
      <h2 style="margin:0 0 16px;font-size:22px;color:#0f172a;font-weight:700;line-height:1.3;">
        Your login OTP is ready
      </h2>

      <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.65;">
        Someone (hopefully you) requested access to the Shahi Dental Clinic ${portalLabel.toLowerCase()} dashboard.
        Use the code below to complete your sign-in.
        <strong style="color:#0f172a;">Do not share this code with anyone.</strong>
      </p>

      <!-- OTP Box -->
      <div style="text-align:center;margin:0 0 26px;">
        <div style="display:inline-block;background:#f0f7f4;border:1.5px solid rgba(23,110,86,0.18);border-radius:14px;padding:24px 32px;">
          <p style="margin:0 0 14px;font-size:11px;color:#437265;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">Your OTP Code</p>
          <div style="white-space:nowrap;">${digitBoxes}</div>
          <p style="margin:14px 0 0;font-size:12px;color:#52796f;">
            Valid for <strong style="color:#176e56;">${validityLabel}</strong>
          </p>
        </div>
      </div>

      <!-- Security Notice -->
      <div style="background:#fafafa;border:1px solid #e5e7eb;border-left:3.5px solid #176e56;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
        <p style="margin:0;font-size:12.5px;color:#475569;line-height:1.55;">
          <strong style="color:#1e293b;">Never share this OTP.</strong> Shahi Dental Clinic staff will never ask you for this code.
          If you did not request this, please ignore this email — your account remains secure.
        </p>
      </div>

      <div style="height:1px;background:#e5e7eb;margin:0 0 20px;"></div>

      <p style="margin:0;font-size:12.5px;color:#64748b;line-height:1.6;">
        This OTP was sent to <strong style="color:#334155;">${deliveryEmail}</strong>.<br />
        This is an automated message — please do not reply.
      </p>
    </div>

    <!-- Footer -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf9;border-top:1px solid #e5e7eb;">
      <tr>
        <td style="padding:16px 36px;font-size:11.5px;color:#64748b;font-weight:500;">
          Powered by <strong style="color:#176e56;">Svaasth</strong> • Developed by Nityom Tikhe
        </td>
        <td style="padding:16px 36px;font-size:11.5px;color:#64748b;text-align:right;">
          © 2026 Shahi Dental Clinic
        </td>
      </tr>
    </table>

    <div style="height:3px;background:linear-gradient(90deg,#0d382c,#176e56,#369568);"></div>

  </div>
</body>
</html>`;
}

type BootstrapAccount = { email: string; password: string; role: string; name: string };

function getBootstrapAccounts(): BootstrapAccount[] {
  const accounts: BootstrapAccount[] = [];

  const adminEmail = process.env.AUTH_LOGIN_EMAIL;
  const adminPassword = process.env.AUTH_LOGIN_PASSWORD;
  if (adminEmail && adminPassword) {
    accounts.push({
      email: normalizeEmail(adminEmail),
      password: adminPassword,
      role: "admin",
      name: process.env.AUTH_BOOTSTRAP_NAME || "Administrator",
    });
  }

  // Staff account: fixed credentials, no delete/sales access (enforced by role).
  const staffEmail = process.env.AUTH_STAFF_LOGIN_EMAIL || "staff@shahidentalclinic.com";
  const staffPassword = process.env.AUTH_STAFF_LOGIN_PASSWORD || "Staff@1234";
  accounts.push({
    email: normalizeEmail(staffEmail),
    password: staffPassword,
    role: "staff",
    name: process.env.AUTH_STAFF_NAME || "Staff",
  });

  return accounts;
}

function getAuthDeliveryEmail(user: AuthUser): string {
  // Per-role override inboxes; falls back to the user's own email if unset.
  const overrideEmail =
    user.role === "staff"
      ? process.env.AUTH_STAFF_OTP_EMAIL
      : process.env.AUTH_OTP_TO_EMAIL;

  if (overrideEmail) {
    return normalizeEmail(overrideEmail);
  }
  return normalizeEmail(user.email);
}

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  return await convex.query(convexAuthFns.getUserByEmail, { email: normalizeEmail(email) }) as AuthUser | null;
}

export async function getUserForLogin(email: string, password: string): Promise<AuthUser | null> {
  const normalizedEmail = normalizeEmail(email);
  const bootstrap = getBootstrapAccounts().find((account) => account.email === normalizedEmail);

  // Restrict authentication to configured accounts only.
  if (!bootstrap) {
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
        role: bootstrap.role,
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

function buildPasswordResetEmailHtml(resetLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Reset Shahi Dental Password</title>
</head>
<body style="margin:0;padding:40px 16px;background:#f4f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <div style="max-width:540px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e2eae3;box-shadow:0 12px 36px rgba(15,23,42,0.07);">

    <!-- Top green gradient strip -->
    <div style="height:5px;background:linear-gradient(90deg,#0d382c 0%,#176e56 50%,#369568 100%);"></div>

    <!-- Header -->
    <div style="background:linear-gradient(150deg,#0d382c 0%,#176e56 60%,#1f8569 100%);padding:36px 32px 32px;text-align:center;">
      <div style="display:inline-block;background:#ffffff;border-radius:12px;padding:8px 18px;margin:0 0 16px;box-shadow:0 4px 14px rgba(0,0,0,0.1);">
        <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td style="vertical-align:middle;padding-right:10px;">
              <img
                src="cid:svaasth_logo"
                alt="Svaasth"
                width="34"
                height="44"
                style="display:block;width:34px;height:44px;object-fit:contain;"
              />
            </td>
            <td style="vertical-align:middle;text-align:left;">
              <div style="font-size:16px;font-weight:800;color:#176e56;letter-spacing:0.08em;line-height:1.2;">SVAASTH</div>
              <div style="font-size:9.5px;font-weight:600;color:#64748b;letter-spacing:0.12em;text-transform:uppercase;">HMS Portal</div>
            </td>
          </tr>
        </table>
      </div>
      <p style="margin:0 0 6px;font-size:11px;color:rgba(255,255,255,0.82);letter-spacing:0.18em;text-transform:uppercase;font-weight:700;">
        Account Recovery
      </p>
      <p style="margin:0;font-size:14px;color:#ffffff;letter-spacing:0.04em;font-weight:600;">
        Shahi Dental Clinic
      </p>
    </div>

    <!-- Main Content -->
    <div style="padding:36px 36px 28px;">
      <h2 style="margin:0 0 14px;font-size:22px;color:#0f172a;font-weight:700;">
        Reset your password
      </h2>
      <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.65;">
        We received a request to reset the password for your account. Click the button below to choose a new password. This link is valid for <strong>30 minutes</strong>.
      </p>

      <div style="text-align:center;margin:0 0 28px;">
        <a
          href="${resetLink}"
          style="display:inline-block;padding:12px 28px;border-radius:10px;background:#176e56;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;box-shadow:0 4px 12px rgba(23,110,86,0.25);"
        >
          Reset Password
        </a>
      </div>

      <div style="background:#fafafa;border:1px solid #e5e7eb;border-left:3.5px solid #176e56;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
        <p style="margin:0;font-size:12.5px;color:#475569;line-height:1.55;">
          If the button above does not work, copy and paste this link into your browser:<br />
          <span style="word-break:break-all;color:#176e56;font-size:12px;">${resetLink}</span>
        </p>
      </div>

      <div style="height:1px;background:#e5e7eb;margin:0 0 20px;"></div>

      <p style="margin:0;font-size:12.5px;color:#64748b;line-height:1.6;">
        If you did not request a password reset, please ignore this email — your account remains completely secure.
      </p>
    </div>

    <!-- Footer -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf9;border-top:1px solid #e5e7eb;">
      <tr>
        <td style="padding:16px 36px;font-size:11.5px;color:#64748b;font-weight:500;">
          Powered by <strong style="color:#176e56;">Svaasth</strong> • Developed by Nityom Tikhe
        </td>
        <td style="padding:16px 36px;font-size:11.5px;color:#64748b;text-align:right;">
          © 2026 Shahi Dental Clinic
        </td>
      </tr>
    </table>

    <div style="height:3px;background:linear-gradient(90deg,#0d382c,#176e56,#369568);"></div>

  </div>
</body>
</html>`;
}

export async function issueLoginOtp(user: AuthUser) {
  const otp = generateOtpCode(4);
  const otpValidityMinutes = 5;
  const expiresAt = Date.now() + otpValidityMinutes * 60 * 1000;
  const deliveryEmail = getAuthDeliveryEmail(user);
  const portalLabel = user.role === "staff" ? "Staff" : "Admin";

  const otpSessionId = await convex.mutation(convexAuthFns.createOtpSession, {
    userId: user._id as any,
    email: normalizeEmail(user.email),
    otp_hash: hashValue(otp),
    expires_at: expiresAt,
  });

  await sendAuthEmail({
    to: deliveryEmail,
    subject: `Shahi Dental Clinic ${portalLabel} Login OTP`,
    text: `Your 4-digit OTP is ${otp}. It is valid for ${otpValidityMinutes} minutes.`,
    html: buildOtpEmailHtml(otp, deliveryEmail, `${otpValidityMinutes} minutes`, portalLabel),
    attachments: getEmailAttachments(),
  });

  return {
    otpSessionId,
    deliveryEmail: maskEmail(deliveryEmail),
    expiresAt,
    message: "OTP sent to your email.",
  };
}

export async function createAndStoreSession(userId: string, role: string = "admin") {
  const rawSessionToken = createRandomToken();
  const isAdmin = role === "admin";
  // Admin session stays persistent (1 year); staff session lasts 10 hours (as before)
  const sessionDurationMs = isAdmin ? 365 * 24 * 60 * 60 * 1000 : 10 * 60 * 60 * 1000;
  const expiresAt = Date.now() + sessionDurationMs;

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
  const deliveryEmail = getAuthDeliveryEmail(user);

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
    html: buildPasswordResetEmailHtml(resetLink),
    attachments: getEmailAttachments(),
  });
}
