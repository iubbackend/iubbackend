'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Mail, Lock, Loader2, Sun, Moon, Phone, User, ArrowLeft, Share2, MessageSquare } from 'lucide-react';

// --- NATIVE BROWSER HASHING HELPER ---
async function hashPassword(password: string) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

type ViewState = 'login' | 'signup' | 'forgot_password' | 'forgot_email';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // View & Referral Lock management
  const [view, setView] = useState<ViewState>('login');
  const [referralCode, setReferralCode] = useState<string | null>(null);
  
  // Form States
  const [rollNumber, setRollNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // UI States
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const getSupabase = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
    return createBrowserClient(supabaseUrl, supabaseKey);
  };

  // --- AUTOMATED REFERRAL EXTRACTOR & TRACKER ---
  useEffect(() => {
    let ref = searchParams.get('ref');

    if (!ref && typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/');
      const refIdx = pathParts.indexOf('ref');
      if (refIdx !== -1 && pathParts[refIdx + 1]) {
        ref = pathParts[refIdx + 1];
      }
    }

    if (ref) {
      const cleanRef = ref.trim().toUpperCase();
      setReferralCode(cleanRef);
      if (typeof window !== 'undefined') {
        localStorage.setItem('referred_by', cleanRef);
      }
      setView('signup'); // FORCE SIGNUP OPEN FOR REFERRED USERS
    } else if (typeof window !== 'undefined') {
      const savedRef = localStorage.getItem('referred_by');
      if (savedRef) {
        setReferralCode(savedRef.toUpperCase());
        setView('signup'); // AUTO OPEN UPON PERSISTED LINK SESSIONS TOO
      }
    }

    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, [searchParams]);

  // COLOR MODE PERSISTENCE
  useEffect(() => {
    const savedTheme = localStorage.getItem("iub_theme");
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    const htmlClass = document.documentElement.classList;
    if (htmlClass.contains('dark')) {
      htmlClass.remove('dark');
      localStorage.setItem("iub_theme", "light");
      setIsDarkMode(false);
    } else {
      htmlClass.add('dark');
      localStorage.setItem("iub_theme", "dark");
      setIsDarkMode(true);
    }
  };

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const switchView = (newView: ViewState) => {
    setView(newView);
    clearMessages();
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 4) {
      value = value.substring(0, 4) + '-' + value.substring(4, 11);
    }
    setPhone(value);
  };

  const maskEmailString = (rawEmail: string) => {
    if (!rawEmail) return "";
    const parts = rawEmail.split("@");
    if (parts.length !== 2) return rawEmail;
    const [name, domain] = parts;
    if (name.length <= 4) return `${name.slice(0, 1)}***@${domain}`;
    return `${name.slice(0, 2)}***${name.slice(-2)}@${domain}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      clearMessages();
  
      const cleanRollNumber = rollNumber.trim().toUpperCase();
  
      // 1. STRICT REGISTRATION FORMAT VALIDATION (NO SPACES, NO SPECIAL CHARACTERS)
      const regRegex = /^[FS]\d{2}[A-Z]+[0-9][ME][0-9]+$/;
      if (!regRegex.test(cleanRollNumber)) {
        setErrorMsg('Invalid Registration Number format. Example: S22BSSE1M01101');
        return;
      }
  
      setIsLoading(true);
      const supabase = getSupabase();
    
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .ilike('reg', cleanRollNumber)
          .maybeSingle();
    
        if (userError || !userData) {
          setErrorMsg('Invalid Roll Number or Password.');
          setIsLoading(false);
          return;
        }
    
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: userData.email.toLowerCase().trim(), 
          password: password, 
        });
    
        if (authError) {
          setErrorMsg('Invalid Roll Number or Password.');
        } else {
          const { data: profile } = await supabase
            .from('users')
            .select('reg, phone, email')
            .ilike('reg', cleanRollNumber)
            .maybeSingle();
    
          const userState = { 
            reg: profile?.reg.toUpperCase() || cleanRollNumber, 
            name: "Student", 
            phone: profile?.phone || "", 
            email: userData.email 
          };
          
          localStorage.setItem("iub_currentUser_v2", JSON.stringify(userState));
          setSuccessMsg('Login successful! Welcome back.');
          
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 500);
        }
      } catch (err) {
        setErrorMsg('An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
  
    const handleSignup = async (e: React.FormEvent) => {
      e.preventDefault();
      clearMessages();
  
      const cleanEmail = email.toLowerCase().trim();
      const cleanRoll = rollNumber.trim().toUpperCase();
  
      // 1. STRICT REGISTRATION FORMAT VALIDATION (NO SPACES, NO SPECIAL CHARACTERS)
      const regRegex = /^[FS]\d{2}[A-Z]+[0-9][ME][0-9]+$/;
      if (!regRegex.test(cleanRoll)) {
        setErrorMsg('Registration Number contains spaces, special characters, or is invalid. Format: S25BARIN1M01118');
        return;
      }
  
      // 2. STRICT GMAIL VALIDATION
      const gmailRegex = /^[a-z0-9](\.?[a-z0-9]){4,}@gmail\.com$/;
      if (!gmailRegex.test(cleanEmail)) {
        setErrorMsg('Only standard, valid @gmail.com email addresses are allowed.');
        return;
      }
  
      const rawNumber = phone.replace(/-/g, '');
      if (!rawNumber.startsWith('03') || rawNumber.length !== 11) {
        setErrorMsg('You entered the wrong number. Enter your correct number otherwise your account can be compromised.');
        return;
      }
  
      setIsLoading(true);
      const supabase = getSupabase();
      const hashedPassword = await hashPassword(password);
  
      try {
        // Sign up user inside Supabase Auth engine
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
        });
  
        if (authError) {
          setErrorMsg(authError.message || 'Error setting up account authentication.');
          setIsLoading(false);
          return;
        }
  
        // Insert the main user account profile record into public schema
        const { error } = await supabase
          .from('users')
          .insert([{ reg: cleanRoll, phone: rawNumber, email: cleanEmail, pass: hashedPassword }]);
  
        if (error) {
          if (error.code === '23505') setErrorMsg('Roll Number or Email already exists.');
          else setErrorMsg('Error creating account. Please try again.');
        } else {
          
          // SECURE REFERRAL ENGINE INTERACTION LINK
          try {
            const activeReferrer = referralCode || (typeof window !== "undefined" ? localStorage.getItem("referred_by") : null);
          
            if (activeReferrer && activeReferrer.toUpperCase().trim() !== cleanRoll) {
              const cleanReferrer = activeReferrer.toUpperCase().trim();
              
              const { error: refError } = await supabase
                .from('referrals')
                .insert({
                  referrer_reg: cleanReferrer,
                  referred_reg: cleanRoll
                });
          
              if (refError) {
                console.error("Database rejected referral coupling insert:", refError);
              } else {
                if (typeof window !== "undefined") {
                  localStorage.removeItem("referred_by");
                }
              }
            }
          } catch (creditErr) {
            console.error("Failed to safely process automatic structural ledger updates:", creditErr);
          }
  
          setSuccessMsg('Account created! A verification OTP has been sent to your email.');
          setTimeout(() => {
            setView('login');
          }, 3000);
        }
      } catch (err) {
        setErrorMsg('An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    };

  const handleForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    
    // STRIPS HYPHENS CLEAN TO PERFECTLY MATCH RAW NUMBER STRING SEARCH PATTERNS
    const targetPhone = phone.replace(/-/g, '').trim();
    if (targetPhone.length !== 11) {
      setErrorMsg('Invalid phone number format. Please enter full 11 digits.');
      return;
    }
  
    setIsLoading(true);
    const supabase = getSupabase();
  
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('phone', targetPhone) 
        .maybeSingle();
        
      if (error || !data) {
        setErrorMsg('No account found matching this phone number layout sequence.');
      } else {
        setSuccessMsg(`Your registered email is: ${data.email}`);
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    const supabase = getSupabase();
    const cleanRoll = rollNumber.trim().toUpperCase();
    const cleanEmail = email.toLowerCase().trim();

    try {
      const { data, error: matchError } = await supabase
        .from('users')
        .select('id')
        .ilike('reg', cleanRoll)
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (matchError || !data) {
        setErrorMsg('Roll Number and Email combination not found.');
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
      
      if (error) {
        setErrorMsg('Failed to send OTP. Ensure Supabase Auth is configured.');
      } else {
        setSuccessMsg('An OTP has been sent to your email address.');
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-slate-800 dark:bg-[#00122a] dark:text-slate-100 font-sans transition-colors duration-300 overflow-x-hidden relative">
      
      {/* 1. MATCHED INTEGRATED HEADER SYSTEM */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b border-gray-200 bg-white/90 dark:border-[#00348c]/50 dark:bg-[#00122a]/90 px-4 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-2.5 max-w-5xl mx-auto w-full justify-between">
          <div className="flex items-center gap-1.5 cursor-pointer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-blue-600 dark:text-amber-500">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fill-current opacity-20"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 14l3-3 2 2 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h1 className="text-base sm:text-lg font-black tracking-tight leading-none whitespace-nowrap dark:text-white">
              IUB Result<span className="text-blue-600 dark:text-amber-500">Backend</span>
            </h1>
          </div>
          
          <button onClick={toggleTheme} className="p-1.5 rounded-lg border border-gray-300 bg-white text-amber-500 dark:border-[#00348c]/50 dark:bg-[#001c4d] dark:text-blue-300 shadow-sm">
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {/* 2. THIN MARQUEE SUB-HEADER INFOBAR */}
      <div className="w-full py-1.5 text-[10px] font-bold tracking-wide flex justify-center items-center gap-2 sm:gap-4 border-b border-gray-200 bg-gray-100 text-gray-600 dark:border-[#00348c]/50 dark:bg-[#000a1a]/80 dark:text-blue-400/60">
        <span>Check Result Before time</span>
        <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
        <span>Marks</span>
        <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
        <span>Other's Result</span>
      </div>

      {/* 3. CORE CONTENT CENTER BODY INTERACTION WRAPPER */}
      <div className="flex-1 flex items-center justify-center p-4 md:py-12">
        <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-8 shadow-xl transition-colors duration-300 dark:bg-[#001c4d]/80 dark:border-[#00348c]/50">
          
          <div className="mb-8 text-center relative">
            {view !== 'login' && (
              <button 
                onClick={() => switchView(view === 'forgot_email' ? 'forgot_password' : 'login')}
                type="button"
                className="absolute left-0 top-1 text-gray-500 hover:text-gray-900 dark:text-blue-300/70 dark:hover:text-white"
              >
                <ArrowLeft size={24} />
              </button>
            )}
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {view === 'login' && 'Welcome Back'}
              {view === 'signup' && 'Create Account'}
              {view === 'forgot_password' && 'Reset Password'}
              {view === 'forgot_email' && 'Find Email'}
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-blue-300/70">
              {view === 'login' && 'Sign in using your Roll Number'}
              {view === 'signup' && 'Register your details below'}
              {view === 'forgot_password' && 'Enter details to receive an OTP'}
              {view === 'forgot_email' && 'Enter your phone to reveal your email'}
            </p>
          </div>

          {view === 'signup' && referralCode && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
              <Share2 size={18} className="animate-pulse" />
              <div className="text-left">
                <p className="text-xs font-black uppercase tracking-wider">Referral Code Applied</p>
                <p className="text-xs opacity-90">Invited by: <span className="font-mono font-bold text-blue-600 dark:text-amber-400">{referralCode}</span></p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:border-red-500/30 dark:text-red-400 font-semibold">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-600 dark:bg-emerald-900/20 dark:border-emerald-500/30 dark:text-emerald-400 font-semibold break-words">
              {successMsg}
            </div>
          )}

          {/* VIEW 1: LOGIN */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-blue-300/70 mb-2">Roll Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. F22BAID1M011"
                    required
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-[#00348c]/50 dark:bg-[#00122a]/50 dark:text-white dark:focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-blue-300/70 mb-2">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-[#00348c]/50 dark:bg-[#00122a]/50 dark:text-white dark:focus:border-amber-500"
                  />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-gradient-to-r dark:from-amber-500 dark:to-amber-600 dark:hover:from-amber-400 dark:hover:to-amber-500 dark:text-[#00122a] px-4 py-3 text-sm font-black shadow-md disabled:opacity-70 transition-all uppercase tracking-wider">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Log In'}
              </button>

              <div className="flex flex-col items-center space-y-4 pt-4 border-t border-gray-200 dark:border-[#00348c]/30 text-sm">
                <button type="button" onClick={() => switchView('forgot_password')} className="text-xs font-semibold text-gray-500 dark:text-blue-300/50 hover:underline hover:text-blue-600 dark:hover:text-amber-400">
                  Forgot Password?
                </button>
                
                {/* UPGRADED ELEVATED BUTTON CALL-TO-ACTION FOR SIGNUP */}
                <div className="w-full text-center space-y-2">
                  <p className="text-xs text-gray-500 dark:text-blue-300/50 font-medium">New to the portal layout?</p>
                  <button 
                    type="button" 
                    onClick={() => switchView('signup')} 
                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-blue-600/50 text-blue-600 dark:border-amber-500/40 dark:text-amber-400 hover:bg-blue-500/5 dark:hover:bg-amber-500/5 font-bold transition-all text-xs"
                  >
                    Create Fresh Account &rarr;
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* VIEW 2: SIGN UP */}
          {view === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-blue-300/70 mb-1.5">Roll Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                    <User size={18} />
                  </div>
                  <input 
                    type="text" 
                    value={rollNumber} 
                    onChange={(e) => setRollNumber(e.target.value.toUpperCase())} 
                    placeholder="e.g. S25BAID1M001" 
                    required 
                    className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-[#00348c]/50 dark:bg-[#00122a]/50 dark:text-white dark:focus:border-amber-500" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-blue-300/70 mb-1.5">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                    <Phone size={18} />
                  </div>
                  <input type="tel" value={phone} onChange={handlePhoneChange} placeholder="e.g. 0311-9277832" maxLength={12} required className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-[#00348c]/50 dark:bg-[#00122a]/50 dark:text-white dark:focus:border-amber-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-blue-300/70 mb-1.5">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                    <Mail size={18} />
                  </div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. student@gmail.com" required className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-[#00348c]/50 dark:bg-[#00122a]/50 dark:text-white dark:focus:border-amber-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-blue-300/70 mb-1.5">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                    <Lock size={18} />
                  </div>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create Password" required className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-[#00348c]/50 dark:bg-[#00122a]/50 dark:text-white dark:focus:border-amber-500" />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="mt-2 flex w-full items-center justify-center rounded-xl bg-green-600 hover:bg-green-700 font-black px-4 py-3 text-sm text-white shadow-md disabled:opacity-70 transition-all uppercase tracking-wider">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Complete Registration'}
              </button>

              <div className="pt-4 border-t border-gray-200 dark:border-[#00348c]/30 text-center">
                <button type="button" onClick={() => switchView('login')} className="text-xs font-bold text-blue-600 dark:text-amber-400 hover:underline">
                  Already registered? Return to Login
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: FORGOT PASSWORD */}
          {view === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <div className="relative mb-4">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400"><User size={18} /></div>
                  <input type="text" value={rollNumber} onChange={(e) => setRollNumber(e.target.value.toUpperCase())} placeholder="Roll Number" required className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none dark:border-[#00348c]/50 dark:bg-[#00122a]/50 dark:text-white" />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400"><Mail size={18} /></div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Registered Email" required className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none dark:border-[#00348c]/50 dark:bg-[#00122a]/50 dark:text-white" />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 text-white py-3 text-sm font-bold shadow-md disabled:opacity-70 transition-all">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Reset Link'}
              </button>

              <div className="text-center pt-2">
                <button type="button" onClick={() => switchView('forgot_email')} className="text-xs font-bold text-blue-600 hover:underline dark:text-amber-400">
                  Forgot your Email? Recover using Phone
                </button>
              </div>
            </form>
          )}

          {/* VIEW 4: FORGOT EMAIL */}
          {view === 'forgot_email' && (
            <form onSubmit={handleForgotEmail} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-blue-300/70 mb-2">Enter Registered Phone</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                    <Phone size={18} />
                  </div>
                  <input type="tel" value={phone} onChange={handlePhoneChange} placeholder="0311-9277832" maxLength={12} required className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-[#00348c]/50 dark:bg-[#00122a]/50 dark:text-white" />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center rounded-xl bg-purple-600 hover:bg-purple-700 text-white py-3 text-sm font-bold shadow-md disabled:opacity-70 transition-all">
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Find My Email'}
              </button>
            </form>
          )}

        </div>
      </div>

      {/* 4. BEAUTIFUL NANO HELPLINE FOOTER */}
      <footer className="w-full py-4 text-center text-xs font-semibold tracking-wide border-t border-gray-200 bg-white text-gray-500 dark:border-[#00348c]/30 dark:bg-[#000a1a]/60">
        <a 
          href="https://wa.me/923119277832" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center gap-2 text-gray-500 hover:text-emerald-500 dark:text-blue-400/70 dark:hover:text-emerald-400 transition-colors"
        >
          <MessageSquare size={14} className="text-emerald-500" />
          <span>Need Help? Contact Admin via WhatsApp Support</span>
        </a>
      </footer>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
