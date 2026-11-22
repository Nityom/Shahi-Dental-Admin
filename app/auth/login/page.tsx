"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Shield, RefreshCw, ChevronLeft, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { signInWithEmail, verifyLoginOtp, resendLoginOtp } from "@/services/adminuser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSessionId, setOtpSessionId] = useState("");
  const [otpDeliveryEmail, setOtpDeliveryEmail] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleResendOtp = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await resendLoginOtp(email, password);
      setOtpSessionId(result.otpSessionId);
      setOtpDeliveryEmail(result.deliveryEmail);
      setOtpExpiresAt(result.expiresAt);
      setOtp("");
      setSuccessMessage("A new 4-digit OTP has been sent.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      if (!isOtpStep) {
        const result = await signInWithEmail(email, password);
        setOtpSessionId(result.otpSessionId);
        setOtpDeliveryEmail(result.deliveryEmail);
        setOtpExpiresAt(result.expiresAt);
        setIsOtpStep(true);
        setSuccessMessage(result.message || "OTP sent successfully.");
      } else {
        await verifyLoginOtp(email, otp, otpSessionId);
        router.push("/admin/patients");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={isOtpStep ? "Verify identity" : "Welcome back"}
      description={
        isOtpStep
          ? `Enter the 4-digit OTP sent to ${otpDeliveryEmail}`
          : "Sign in with your clinic account to continue."
      }
      footer={
        <>
          Need help signing in?{" "}
          <Link href="/auth/forgot_password" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Reset password
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-800"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {!isOtpStep ? (
          <>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="name@shahidentalclinic.com"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                  Password
                </label>
                <Link
                  href="/auth/forgot_password"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                >
                  {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#176e56] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#155944] focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                "Sending OTP…"
              ) : (
                <>
                  Send OTP <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <div>
              <label htmlFor="otp" className="mb-2 block text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                4-Digit One-Time Password
              </label>
              <div className="relative">
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="• • • •"
                  className="h-13 w-full rounded-xl border border-slate-200 bg-white px-4 text-center text-2xl tracking-[0.4em] font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                />
              </div>
              {otpExpiresAt && (
                <p className="mt-2 text-xs text-slate-500">
                  Valid until {new Date(otpExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={loading}
                className="flex items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Resend OTP
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOtpStep(false);
                  setOtp("");
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="flex items-center gap-1 font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Change credentials
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 4}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#176e56] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#155944] focus:outline-none focus:ring-4 focus:ring-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                "Verifying OTP…"
              ) : (
                <>
                  Verify OTP & Sign In <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </>
        )}

        <p className="text-center text-xs leading-5 text-slate-400">
          By continuing, you agree to use this account only for authorized clinic work.
        </p>
      </form>
    </AuthLayout>
  );
}
