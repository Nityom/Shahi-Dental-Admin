// components/ResetPassword.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { updatePassword } from "@/services/adminuser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, CheckCircle, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Check if passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Check password strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    if (!token) {
      setError("Reset link is invalid or missing token. Please request a new reset link.");
      setLoading(false);
      return;
    }

    try {
      await updatePassword(password, token);
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-100 via-teal-50 to-indigo-100 py-10 px-4 relative">
      {/* Abstract background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl"></div>
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
            className="mb-8 flex justify-center"
          >
            <Image 
            src="/dental_logo.svg" 
              alt="Shahi Dental Clinic Logo" 
              width={190} 
              height={95}
              className="object-contain drop-shadow-lg"
              onError={(e) => {
                e.currentTarget.src = "/placeholder-logo.jpg";
              }}
            />
          </motion.div>

          <Card className="relative border-0 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] backdrop-blur-sm bg-white/90">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-teal-500/5 z-0"></div>
            <div className="relative z-10 bg-white/95 shadow-xl rounded-2xl border border-white/40">
              {/* Enhanced gradient top bar */}
              <div className="h-2 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600"></div>
              
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
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-lg"
                    >
                      <Shield className="h-8 w-8 text-white" />
                    </motion.div>
                  </div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                    Create New Password
                  </CardTitle>
                  <CardDescription className="text-gray-600 mt-2">
                    Enter and confirm your new password
                  </CardDescription>
                </motion.div>
              </CardHeader>
              
              <CardContent className="px-8 py-4">
                {success ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="py-6"
                  >
                    <div className="text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">Password Reset Successful!</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        Your password has been updated successfully. You will be redirected to the login page shortly.
                      </p>
                      <div className="mt-4">
                        <Button 
                          onClick={() => router.push("/auth/login")}
                          className="bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl px-4 py-2 text-sm transition-colors"
                        >
                          Go to Login
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
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
                        <Alert variant="destructive" className="bg-red-50 text-red-600 py-2 text-sm border border-red-200 rounded-xl shadow-sm">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                    
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center">
                        <Lock className="h-4 w-4 mr-2 text-teal-500" />
                        New Password
                      </Label>
                      <div className="relative group">
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="pl-4 h-11 bg-white/50 backdrop-blur-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-teal-400 shadow-sm group-hover:shadow-md transition-all duration-300"
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-400/0 via-blue-400/0 to-indigo-400/0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 flex items-center">
                        <Lock className="h-4 w-4 mr-2 text-teal-500" />
                        Confirm New Password
                      </Label>
                      <div className="relative group">
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="pl-4 h-11 bg-white/50 backdrop-blur-sm border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-400 focus:border-teal-400 shadow-sm group-hover:shadow-md transition-all duration-300"
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-400/0 via-blue-400/0 to-indigo-400/0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 -z-10"></div>
                      </div>
                    </div>
                    
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="mt-6"
                    >
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white h-11 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-xl font-medium overflow-hidden relative"
                        disabled={loading}
                      >
                        {loading ? (
                          <div className="flex items-center justify-center">
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            <span>Updating password...</span>
                          </div>
                        ) : (
                          <>
                            <span className="absolute inset-0 bg-white/20 blur-md scale-150 animate-pulse-slow opacity-0 hover:opacity-100 transition-opacity duration-1000"></span>
                            <span className="flex items-center justify-center relative z-10">
                              Reset Password
                            </span>
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </motion.form>
                )}
              </CardContent>
              
              {!success && (
                <motion.div 
                  className="px-8 py-4 flex justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <div className="text-center text-sm text-gray-500">
                    <p>Remember your password?{" "}
                      <Link href="/auth/login" className="text-teal-600 hover:text-teal-800 font-medium transition-colors">
                        Back to login
                      </Link>
                    </p>
                  </div>
                </motion.div>
              )}
              
              <CardFooter className="py-3 flex justify-between bg-gradient-to-r from-gray-50 to-blue-50/30 px-8 text-xs text-gray-500">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <Link href="/support" className="text-teal-600 hover:text-teal-800 transition-colors flex items-center">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Need help?
                  </Link>
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="text-gray-400"
                >
                  © 2025 KS Dental & Aesthetics Dental
                </motion.p>
              </CardFooter>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}