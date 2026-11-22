import { ConvexHttpClient } from "convex/browser";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
}

export const convex = new ConvexHttpClient(convexUrl);

export type ConvexMutationRef = Parameters<ConvexHttpClient["mutation"]>[0];
export type ConvexQueryRef = Parameters<ConvexHttpClient["query"]>[0];

export const convexAuthFns = {
  getUserByEmail: "auth:getUserByEmail" as unknown as ConvexQueryRef,
  createUser: "auth:createUser" as unknown as ConvexMutationRef,
  updateUserPassword: "auth:updateUserPassword" as unknown as ConvexMutationRef,
  touchUserLogin: "auth:touchUserLogin" as unknown as ConvexMutationRef,
  createOtpSession: "auth:createOtpSession" as unknown as ConvexMutationRef,
  getOtpSessionById: "auth:getOtpSessionById" as unknown as ConvexQueryRef,
  registerOtpAttempt: "auth:registerOtpAttempt" as unknown as ConvexMutationRef,
  consumeOtpSession: "auth:consumeOtpSession" as unknown as ConvexMutationRef,
  createAuthSession: "auth:createAuthSession" as unknown as ConvexMutationRef,
  getAuthSessionByHash: "auth:getAuthSessionByHash" as unknown as ConvexQueryRef,
  revokeAuthSession: "auth:revokeAuthSession" as unknown as ConvexMutationRef,
  revokeAllUserSessions: "auth:revokeAllUserSessions" as unknown as ConvexMutationRef,
  createPasswordResetToken: "auth:createPasswordResetToken" as unknown as ConvexMutationRef,
  getPasswordResetByHash: "auth:getPasswordResetByHash" as unknown as ConvexQueryRef,
  consumePasswordResetToken: "auth:consumePasswordResetToken" as unknown as ConvexMutationRef,
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generateOtpCode(length = 4): string {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  const code = crypto.randomInt(min, max + 1);
  return String(code);
}

export function createRandomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return email;
  }

  if (local.length <= 2) {
    return `${local[0] ?? "*"}***@${domain}`;
  }

  return `${local.slice(0, 2)}***@${domain}`;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (!passwordHash) {
    return false;
  }

  if (passwordHash.startsWith("$2")) {
    return await bcrypt.compare(password, passwordHash);
  }

  return password === passwordHash;
}

export function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000"
  );
}

function buildTransporter() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = String(process.env.SMTP_SECURE || "false") === "true";

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM.");
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

export async function sendAuthEmail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: any[];
}) {
  const from = process.env.SMTP_FROM;
  if (!from) {
    throw new Error("SMTP_FROM is not configured.");
  }

  const transporter = buildTransporter();
  await transporter.sendMail({
    from: `"Shahi Dental Admin" <${from}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments,
  });
}
