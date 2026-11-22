// components/ForgotPassword.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { resetPassword } from "@/services/adminuser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center bg-[#e9efeb] py-10 px-4 relative">
      {/* Abstract background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="w-full max-w-md mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 15 }}
            className="mb-8 flex justify-center items-center gap-3"
          >
            <Image
              src="/dental_logo.webp"
              alt="Shahi Dental Clinic Logo"
              width={160}
              height={80}
              className="object-contain drop-shadow-md"
              onError={(e) => {
                e.currentTarget.src = "/placeholder-logo.jpg";
              }}
            />
          </motion.div>

          <Card className="relative border-0 rounded-2xl overflow-hidden shadow-[0_24px_70px_-42px_rgba(8,47,46,0.35)] bg-white">
            <div className="relative z-10 bg-white">
              {/* Gradient top bar */}
              <div className="h-1.5 bg-gradient-to-r from-[#0c826f] via-[#36b493] to-[#a0ddbf]"></div>

              <CardHeader className="pt-6 pb-4 px-8">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-center"
                >
                  <div className="flex justify-center mb-3">
                    <motion.div
                      whileHover={{ rotate: [0, -5, 5, -5, 5, 0], transition: { duration: 0.5 } }}
                      className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-xs"
                    >
                      <Mail className="h-6 w-6 text-emerald-700" />
                    </motion.div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-[#142a25]">
                    Reset Your Password
                  </CardTitle>
                  <CardDescription className="text-slate-500 mt-2">
                    Enter your email to receive a password reset link
                  </CardDescription>
                </motion.div>
              </CardHeader>

              <CardContent className="px-8 py-4">
                <motion.form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert variant="destructive" className="bg-rose-50 text-rose-700 py-2 text-sm border border-rose-200 rounded-xl shadow-xs">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert className="bg-emerald-50 text-emerald-800 py-3 text-sm border border-emerald-200 rounded-xl shadow-xs">
                        <div className="flex items-center">
                          <CheckCircle className="h-5 w-5 mr-2 text-emerald-600" />
                          <AlertDescription>
                            Password reset email sent! Please check your inbox and follow the instructions.
                          </AlertDescription>
                        </div>
                      </Alert>
                    </motion.div>
                  )}

                  {!success && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-semibold text-slate-700 flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-emerald-600" />
                          Email Address
                        </Label>
                        <div className="relative group">
                          <Input
                            id="email"
                            type="email"
                            placeholder="name@shahidentalclinic.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-11 border-slate-200 rounded-xl focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 shadow-xs transition-all duration-200"
                          />
                        </div>
                      </div>

                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="mt-6"
                      >
                        <Button
                          type="submit"
                          className="w-full bg-[#176e56] hover:bg-[#155944] text-white h-11 shadow-sm transition-all duration-200 rounded-xl font-semibold cursor-pointer"
                          disabled={loading}
                        >
                          {loading ? (
                            <div className="flex items-center justify-center">
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              <span>Sending reset link...</span>
                            </div>
                          ) : (
                            <span>Send Reset Link</span>
                          )}
                        </Button>
                      </motion.div>
                    </>
                  )}
                </motion.form>
              </CardContent>

              <motion.div
                className="px-8 py-3 flex justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <div className="flex items-center text-sm bg-emerald-50 border border-emerald-100 py-1.5 px-4 rounded-full transition-all duration-200 group">
                  <ArrowLeft className="h-4 w-4 text-emerald-600 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                  <Link href="/auth/login" className="text-emerald-700 hover:text-emerald-800 font-semibold transition-colors">
                    Back to login
                  </Link>
                </div>
              </motion.div>

              <CardFooter className="py-3 flex justify-between bg-slate-50 border-t border-slate-100 px-8 text-xs text-slate-500">
                <span className="text-slate-500 font-medium">Powered by Svaasth HMS</span>
                <span className="text-slate-400">© {new Date().getFullYear()} Shahi Dental Clinic</span>
              </CardFooter>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
