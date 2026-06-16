"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Gift, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export default function ReferralPage({ params }: { params: { reg: string } }) {
  const router = useRouter();
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);

  const referralCode = params.reg.toUpperCase();

  useEffect(() => {
    async function checkReferral() {
      try {
        // Look up the referrer's name from the students table
        const { data, error } = await supabase
          .from("students")
          .select("name")
          .ilike("reg", referralCode)
          .maybeSingle();

        if (data && data.name) {
          setReferrerName(data.name);
          setIsValid(true);
        } else {
          // If name isn't found, check if they exist in the users table at least
          const { data: user, error: userErr } = await supabase
            .from("users")
            .select("reg")
            .ilike("reg", referralCode)
            .maybeSingle();
            
          if (user) {
            setReferrerName("A Student");
            setIsValid(true);
          } else {
            setIsValid(false);
          }
        }
      } catch (err) {
        console.error("Referral lookup failed", err);
        setIsValid(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkReferral();
  }, [referralCode]);

  const handleAcceptInvite = () => {
    // Save the referral code to the browser so the login page can use it during signup
    if (typeof window !== "undefined") {
      localStorage.setItem("referred_by", referralCode);
    }
    // Redirect to login page
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#00122a] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#00122a] text-slate-100 flex items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#0056b3] rounded-full blur-[120px] opacity-20 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-500 rounded-full blur-[120px] opacity-10 pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        className="w-full max-w-md bg-[#001c4d]/80 backdrop-blur-xl border border-[#00348c]/50 p-8 rounded-3xl shadow-2xl relative z-10 text-center"
      >
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-6 relative">
          <Gift size={36} className="text-[#00122a]" />
          <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm">
            <Sparkles size={16} className="text-amber-500" />
          </div>
        </div>

        {isValid ? (
          <>
            <h1 className="text-2xl font-black mb-2">You've been invited!</h1>
            <p className="text-blue-200/80 mb-8 text-sm">
              <span className="font-bold text-white">{referrerName}</span> ({referralCode}) has invited you to join the IUB Result Portal. Sign up now to access academic analytics and complete records.
            </p>

            <button 
              onClick={handleAcceptInvite}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#00122a] font-black rounded-xl py-3.5 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all"
            >
              Accept Invite & Sign Up <ArrowRight size={18} />
            </button>
            <p className="text-[10px] text-blue-300/50 mt-4 uppercase tracking-wider font-semibold">
              Your friend will earn a 20% bonus when you top up!
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black mb-2 text-red-400">Invalid Link</h1>
            <p className="text-blue-200/80 mb-8 text-sm">
              We couldn't find a user matching this referral code. The link might be broken or expired.
            </p>
            <button 
              onClick={() => router.push("/login")}
              className="w-full bg-[#0056b3] hover:bg-[#004494] text-white font-bold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all"
            >
              Continue to Portal Anyway
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
