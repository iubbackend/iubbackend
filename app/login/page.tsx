"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, KeyRound, ArrowRight, GraduationCap } from "lucide-react";

type AuthMode = "login" | "signup" | "forgot";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);

  // Mock submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Add your API calls here
    setTimeout(() => setIsLoading(false), 1500); 
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-teal-500/20 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative z-10"
      >
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400">
              <GraduationCap size={32} />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center text-white mb-2">
            {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset Password"}
          </h2>
          <p className="text-slate-400 text-center mb-8">
            {mode === "login" ? "Enter your credentials to access your portal." : 
             mode === "signup" ? "Register with your Roll Number to continue." : 
             "We'll send an OTP to your registered email."}
          </p>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* Sign Up Specific Fields */}
              {mode === "signup" && (
                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-slate-500" size={20} />
                    <input type="text" placeholder="Full Name" required
                      className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" />
                  </div>
                </div>
              )}

              {/* Common Fields (Roll Number / Email) */}
              <div className="relative">
                {mode === "forgot" ? <Mail className="absolute left-3 top-3 text-slate-500" size={20} /> : <GraduationCap className="absolute left-3 top-3 text-slate-500" size={20} />}
                <input type={mode === "forgot" ? "email" : "text"} placeholder={mode === "forgot" ? "Email Address" : "Roll Number (e.g. FA20-BSE-001)"} required
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" />
              </div>

              {mode === "signup" && (
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-500" size={20} />
                  <input type="email" placeholder="Email Address" required
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" />
                </div>
              )}

              {/* Password / OTP Field */}
              {mode !== "forgot" && (
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-500" size={20} />
                  <input type="password" placeholder={mode === "signup" ? "Create Password" : "Password / OTP"} required
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all" />
                </div>
              )}

              {/* Forgot Password Link */}
              {mode === "login" && (
                <div className="flex justify-end">
                  <button type="button" onClick={() => setMode("forgot")} className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
                    Forgot Password?
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button disabled={isLoading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                {isLoading ? (
                  <motion.div animate={{ rotagitte: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <KeyRound size={20} />
                  </motion.div>
                ) : (
                  <>
                    {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset OTP"}
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </motion.form>
          </AnimatePresence>

          {/* Toggle Modes */}
          <div className="mt-8 text-center text-slate-400 text-sm">
            {mode === "login" ? (
              <p>Don't have an account? <button onClick={() => setMode("signup")} className="text-emerald-400 font-medium hover:underline">Sign up</button></p>
            ) : (
              <p>Back to <button onClick={() => setMode("login")} className="text-emerald-400 font-medium hover:underline">Login</button></p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}