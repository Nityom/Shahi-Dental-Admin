"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signInWithEmail, verifyLoginOtp, resendLoginOtp } from "@/services/adminuser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, Shield, ArrowRight, RefreshCw, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Tooth SVG ───────────────────────────────────────────────────────────────
function ToothIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M30 10 Q20 5 15 20 Q10 35 18 55 Q22 70 25 90 Q28 100 35 98 Q40 96 42 80 Q44 65 50 65 Q56 65 58 80 Q60 96 65 98 Q72 100 75 90 Q78 70 82 55 Q90 35 85 20 Q80 5 70 10 Q60 2 50 5 Q40 2 30 10Z"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
      />
    </svg>
  );
}

// ─── Feature list item ────────────────────────────────────────────────────────
function Feature({ label, delay }: { label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.45, ease: "easeOut" }}
      className="flex items-center gap-3"
    >
      <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
      <span className="text-sm text-white/65 font-light">{label}</span>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSessionId, setOtpSessionId] = useState("");
  const [otpDeliveryEmail, setOtpDeliveryEmail] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    setSuccessMessage("");
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
    setError("");
    setSuccessMessage("");
    try {
      if (!isOtpStep) {
        const result = await signInWithEmail(email, password);
        setOtpSessionId(result.otpSessionId);
        setOtpDeliveryEmail(result.deliveryEmail);
        setOtpExpiresAt(result.expiresAt);
        setIsOtpStep(true);
        setSuccessMessage(result.message);
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

  if (!mounted) return null;

  return (
    <>
      {/* Google Font injection */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500&display=swap');
        .font-playfair { font-family: 'Playfair Display', serif; }
        .font-dm { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <div className="font-dm h-screen w-screen overflow-hidden flex items-center justify-center bg-[#e8f4fd] relative">

        {/* Background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-teal-300/20 to-transparent blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-blue-400/20 to-transparent blur-3xl" />
          <div className="absolute top-1/3 left-1/3 w-72 h-72 rounded-full bg-cyan-300/10 blur-2xl" />
        </div>


        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex w-[900px] max-w-[95vw] min-h-[540px] rounded-[28px] overflow-hidden shadow-[0_32px_80px_rgba(2,62,138,0.18),0_0_0_1px_rgba(255,255,255,0.6)]"
        >

          {/* ── Left panel ───────────────────────────────────────────────── */}
          <div className="hidden md:flex flex-col justify-between w-[42%] shrink-0 bg-gradient-to-b from-[#023E8A] via-[#0077B6] to-[#0096C7] p-12 relative overflow-hidden">
            {/* decorative rings */}
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full border-[40px] border-white/5 pointer-events-none" />
            <div className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full border-[50px] border-teal-400/10 pointer-events-none" />

            {/* Brand */}
            <div className="relative z-10 flex flex-col gap-6">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-playfair text-white text-2xl font-bold leading-snug mb-2">
                  Shahi Dental Clinic
                </h1>
                <p className="text-white/55 text-sm font-light leading-relaxed">
                  Secure administrative portal for managing your clinic's daily operations.
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="relative z-10 flex flex-col gap-4">
              <Feature label="Patient records & appointments" delay={0.5} />
              <Feature label="Billing & invoices management" delay={0.65} />
              <Feature label="Staff scheduling & reports" delay={0.8} />
            </div>

            {/* Footer */}
            <p className="relative z-10 text-white/30 text-xs">
              Developed by Nityom Tikhe
            </p>
          </div>

          {/* ── Right panel ──────────────────────────────────────────────── */}
          <div className="flex-1 bg-white flex flex-col justify-between">
            {/* Top gradient bar */}
            <div className="h-1.5 bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-600" />

            <div className="flex-1 flex flex-col justify-center px-10 py-10">

              {/* Logo */}
              <div className="flex justify-center mb-7">
                <Image
                  src="/dental_logo.webp"
                  alt="Shahi Dental Clinic"
                  width={120}
                  height={72}
                  className="object-contain"
                  onError={(e) => { e.currentTarget.src = "/placeholder-logo.jpg"; }}
                />
              </div>

              {/* Header */}
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-200/60 rounded-full px-3.5 py-1.5 mb-4">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  <span className="text-[11px] font-medium text-teal-700 uppercase tracking-widest">Admin Portal</span>
                </div>
                <h2 className="font-playfair text-[#1a2e44] text-3xl font-bold leading-tight mb-1">
                  {isOtpStep ? "Verify your identity" : "Welcome back"}
                </h2>
                <p className="text-[#6b8299] text-sm font-light">
                  {isOtpStep
                    ? `Enter the 4-digit OTP sent to ${otpDeliveryEmail}`
                    : "Sign in with OTP to access your dashboard"}
                </p>
              </div>

              {/* Alerts */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-4"
                  >
                    <Alert variant="destructive" className="bg-red-50 border-red-200 rounded-xl py-2 text-sm">
                      <AlertDescription className="text-red-600">{error}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
                {successMessage && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mb-4"
                  >
                    <Alert className="bg-green-50 border-green-200 rounded-xl py-2 text-sm">
                      <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <AnimatePresence mode="wait">
                  {!isOtpStep ? (
                    <motion.div
                      key="credentials"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {/* Email */}
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm font-medium text-[#1a2e44] flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-teal-500" />
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-11 bg-[#F0F7FF] border-[rgba(0,120,180,0.12)] rounded-xl focus-visible:ring-teal-400 focus-visible:border-teal-400 text-sm placeholder:text-[#afc5d9] transition-shadow duration-200 hover:shadow-sm"
                        />
                      </div>

                      {/* Password */}
                      <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-sm font-medium text-[#1a2e44] flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-teal-500" />
                          Password
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="h-11 bg-[#F0F7FF] border-[rgba(0,120,180,0.12)] rounded-xl focus-visible:ring-teal-400 focus-visible:border-teal-400 text-sm transition-shadow duration-200 hover:shadow-sm"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Link
                          href="/auth/forgot_password"
                          className="text-xs text-teal-600 hover:text-teal-800 transition-colors duration-150"
                        >
                          Forgot password?
                        </Link>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="otp"
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-3"
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor="otp" className="text-sm font-medium text-[#1a2e44] flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5 text-teal-500" />
                          One-Time Password
                        </Label>
                        <Input
                          id="otp"
                          type="text"
                          inputMode="numeric"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          required
                          placeholder="• • • •"
                          maxLength={4}
                          className="h-11 bg-[#F0F7FF] border-[rgba(0,120,180,0.12)] rounded-xl focus-visible:ring-teal-400 focus-visible:border-teal-400 text-2xl tracking-[0.4em] text-center font-medium transition-shadow duration-200 hover:shadow-sm"
                        />
                      </div>
                      {otpExpiresAt && (
                        <p className="text-[11.5px] text-[#6b8299]">
                          Valid until {new Date(otpExpiresAt).toLocaleTimeString()}
                        </p>
                      )}
                      <div className="flex gap-4 pt-1">
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={loading}
                          className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 disabled:opacity-50 transition-colors duration-150"
                        >
                          <RefreshCw className="w-3 h-3" /> Resend OTP
                        </button>
                        <button
                          type="button"
                          onClick={() => { setIsOtpStep(false); setOtp(""); setError(""); setSuccessMessage(""); }}
                          className="flex items-center gap-1.5 text-xs text-[#6b8299] hover:text-[#1a2e44] transition-colors duration-150"
                        >
                          <ChevronLeft className="w-3 h-3" /> Change credentials
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <motion.div whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }} className="pt-1">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-medium text-sm shadow-[0_6px_24px_rgba(0,119,182,0.3)] hover:shadow-[0_10px_32px_rgba(0,119,182,0.38)] transition-all duration-200 border-0"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {isOtpStep ? "Verifying…" : "Signing in…"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {isOtpStep ? "Verify OTP" : "Send OTP"}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </motion.div>
              </form>

              {/* Security note */}
              <div className="mt-5 flex items-start gap-2.5 bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                <Shield className="w-3.5 h-3.5 text-[#0077B6] mt-0.5 shrink-0" />
                <p className="text-[11.5px] text-[#6b8299] leading-relaxed">
                  Secured with two-factor OTP verification. Unauthorized access is monitored.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-10 py-3 bg-gradient-to-r from-gray-50 to-blue-50/30 border-t border-gray-100 text-[11px] text-[#afc5d9]">
              <span>Developed by Nityom Tikhe</span>
              <span>© 2026 Shahi Dental Clinic</span>
            </div>
          </div>

        </motion.div>
      </div>
    </>
  );
}