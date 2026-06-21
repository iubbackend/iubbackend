'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Mail, Lock, Loader2, Sun, Moon, Phone, User, ArrowLeft, Share2 } from 'lucide-react';

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
      setView('signup');
    } else if (typeof window !== 'undefined') {
      const savedRef = localStorage.getItem('referred_by');
      if (savedRef) setReferralCode(savedRef.toUpperCase());
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
    setIsLoading(true);
  
    const supabase = getSupabase();
    const cleanRollNumber = rollNumber.trim().toUpperCase();
  
    try {
      // 1. Find the email associated with this roll number first
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
  
      // 2. Authenticate directly using Supabase Auth with the retrieved email
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userData.email.toLowerCase().trim(), 
        password: password, 
      });
  
      if (authError) {
        setErrorMsg('Invalid Roll Number or Password.');
      } else {
        // 3. Complete session retrieval now that RLS allows access
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
        
        localStorage.setItem("iub_currentUser", JSON.stringify(userState));
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

    if (!cleanEmail.endsWith('@gmail.com')) {
      setErrorMsg('Only @gmail.com email addresses are allowed.');
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
      });

      if (authError) {
        setErrorMsg(authError.message || 'Error setting up account authentication.');
        setIsLoading(false);
        return;
      }

      const { error } = await supabase
        .from('users')
        .insert([{ reg: cleanRoll, phone: phone.trim(), email: cleanEmail, pass: hashedPassword }]);

      if (error) {
        if (error.code === '23505') setErrorMsg('Roll Number or Email already exists.');
        else setErrorMsg('Error creating account. Please try again.');
      } else {
        try {
          const savedReferral = typeof window !== "undefined" ? localStorage.getItem("referred_by") : null;
          
          await supabase
            .from('user_credits')
            .insert([{ 
              user_reg: cleanRoll, 
              credits: 0, 
              free_searches_today: 0,
              referred_by: savedReferral ? savedReferral.toUpperCase() : null
            }]);

          if (typeof window !== "undefined") {
            localStorage.removeItem("referred_by");
          }
        } catch (creditErr) {
          console.error("Failed to initialize user wallet/referral:", creditErr);
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
    
    const targetPhone = phone.trim();
    const rawNumber = targetPhone.replace(/-/g, '');
    if (!rawNumber.startsWith('03') || rawNumber.length !== 11) {
      setErrorMsg('Invalid phone number format.');
      return;
    }

    setIsLoading(true);
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, reg, email, phone')
        .ilike('reg', cleanRollNumber)
        .eq('pass', hashedPassword) // <--- Change .ilike to .eq here
        .maybeSingle();
      
      if (error || !data) {
        setErrorMsg('No account found with this phone number.');
      } else {
        setSuccessMsg(`Your registered email is: ${maskEmailString(data.email)}`);
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
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 transition-colors duration-300 dark:bg-gray-900 p-4">
      
      <button
        onClick={toggleTheme}
        type="button"
        className="absolute top-6 right-6 p-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl transition-colors duration-300 dark:bg-gray-800 dark:shadow-2xl">
        
        <div className="mb-8 text-center relative">
          {view !== 'login' && (
            <button 
              onClick={() => switchView(view === 'forgot_email' ? 'forgot_password' : 'login')}
              type="button"
              className="absolute left-0 top-1 text-gray-500 hover:text-gray-900 dark:hover:text-white"
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
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
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
              <p className="text-xs opacity-90">Invited by: <span className="font-mono font-bold">{referralCode}</span> (Locked)</p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400 font-semibold">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-900/30 dark:text-green-400 font-semibold">
            {successMsg}
          </div>
        )}

        {/* VIEW 1: LOGIN */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Roll Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <User size={20} />
                </div>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                  placeholder="FA23-BSE-001"
                  required
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-70 transition-all">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Log In'}
            </button>

            <div className="flex flex-col items-center space-y-3 pt-4 text-sm text-gray-600 dark:text-gray-400">
              <button type="button" onClick={() => switchView('forgot_password')} className="hover:text-blue-600 hover:underline dark:hover:text-blue-400">
                Forgot Password?
              </button>
              <p>
                Don't have an account?{' '}
                <button type="button" onClick={() => switchView('signup')} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
                  Sign Up
                </button>
              </p>
            </div>
          </form>
        )}

        {/* VIEW 2: SIGN UP */}
        {view === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <User size={20} />
                </div>
                <input type="text" value={rollNumber} onChange={(e) => setRollNumber(e.target.value.toUpperCase())} placeholder="Roll Number" required className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
            </div>

            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <Phone size={20} />
                </div>
                <input type="tel" value={phone} onChange={handlePhoneChange} placeholder="0300-1234567" maxLength={12} required className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
            </div>

            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <Mail size={20} />
                </div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (@gmail.com)" required className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
            </div>

            <div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <Lock size={20} />
                </div>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="mt-2 flex w-full items-center justify-center rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-green-700 disabled:opacity-70 transition-all">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign Up'}
            </button>
          </form>
        )}

        {/* VIEW 3: FORGOT PASSWORD */}
        {view === 'forgot_password' && (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div>
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400"><User size={20} /></div>
                <input type="text" value={rollNumber} onChange={(e) => setRollNumber(e.target.value.toUpperCase())} placeholder="Roll Number" required className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400"><Mail size={20} /></div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Registered Email" required className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-orange-600 disabled:opacity-70 transition-all">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send OTP via Supabase'}
            </button>

            <div className="text-center pt-2">
              <button type="button" onClick={() => switchView('forgot_email')} className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
                Forgot your Email? Click here
              </button>
            </div>
          </form>
        )}

        {/* VIEW 4: FORGOT EMAIL */}
        {view === 'forgot_email' && (
          <form onSubmit={handleForgotEmail} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Enter Registered Phone</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  <Phone size={20} />
                </div>
                <input type="tel" value={phone} onChange={handlePhoneChange} placeholder="0300-1234567" maxLength={12} required className="w-full rounded-xl border border-gray-300 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-purple-700 disabled:opacity-70 transition-all">
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Find My Email'}
            </button>
          </form>
        )}

      </div>
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
