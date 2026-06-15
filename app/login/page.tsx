'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr'; // ✅ Upgraded to SSR client
import { Mail, Lock, Loader2, Sun, Moon, Phone, User, ArrowLeft } from 'lucide-react';

// --- NATIVE BROWSER HASHING HELPER ---
// Converts a plain text password into a secure SHA-256 hash string
async function hashPassword(password: string) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

type ViewState = 'login' | 'signup' | 'forgot_password' | 'forgot_email';

export default function LoginPage() {
  const router = useRouter();

  // State for View Management
  const [view, setView] = useState<ViewState>('login');
  
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

  // --- SAFE SUPABASE INITIALIZATION ---
  // ✅ Uses createBrowserClient so authentication sessions are stored in cookies for the middleware
  const getSupabase = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';
    return createBrowserClient(supabaseUrl, supabaseKey);
  };

  // --- DARK MODE LOGIC ---
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const htmlClass = document.documentElement.classList;
    if (htmlClass.contains('dark')) {
      htmlClass.remove('dark');
      setIsDarkMode(false);
    } else {
      htmlClass.add('dark');
      setIsDarkMode(true);
    }
  };

  // --- SHARED HELPERS ---
  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const switchView = (newView: ViewState) => {
    setView(newView);
    clearMessages();
  };

  // --- PHONE FORMATTER ---
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 4) {
      value = value.substring(0, 4) + '-' + value.substring(4, 11);
    }
    setPhone(value);
  };

  // --- 1. LOGIN LOGIC ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    const supabase = getSupabase();
    
    // Hash the password before checking the database
    const hashedPassword = await hashPassword(password);

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, reg, email, phone')
        .eq('reg', rollNumber)
        .eq('pass', hashedPassword) // Check against the hash
        .single();

      if (error || !data) {
        setErrorMsg('Invalid Roll Number or Password.');
      } else {
        // --- Actual Supabase Auth Sign In ---
        // Note: Supabase auth still expects the raw password to handle its own internal verification
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: data.email, 
          password: password, 
        });

        if (authError) {
          setErrorMsg('Authentication error: ' + authError.message);
        } else {
          setSuccessMsg('Login successful! Welcome back.');
          
          // Small timeout gives the browser a split second to finish writing the cookie
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 500);
        }
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. SIGN UP LOGIC (UPDATED FOR OTP) ---
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!email.toLowerCase().endsWith('@gmail.com')) {
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

    // Hash the password before inserting into the custom table
    const hashedPassword = await hashPassword(password);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password, // Supabase Auth needs the raw text, it securely hashes it internally
      });

      if (authError) {
        setErrorMsg(authError.message || 'Error setting up account authentication.');
        setIsLoading(false);
        return;
      }

      const { error } = await supabase
        .from('users')
        .insert([{ reg: rollNumber, phone, email, pass: hashedPassword }]); // Insert the hash, not plain text

      if (error) {
        if (error.code === '23505') setErrorMsg('Roll Number or Email already exists.');
        else setErrorMsg('Error creating account. Please try again.');
      } else {
        setSuccessMsg('Account created! A verification OTP has been sent to your email.');
        setTimeout(() => switchView('login'), 3000);
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. FORGOT EMAIL LOGIC ---
  const handleForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    
    const rawNumber = phone.replace(/-/g, '');
    if (!rawNumber.startsWith('03') || rawNumber.length !== 11) {
      setErrorMsg('Invalid phone number format.');
      return;
    }

    setIsLoading(true);
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('phone', phone)
        .single();

      if (error || !data) {
        setErrorMsg('No account found with this phone number.');
      } else {
        setSuccessMsg(`Your registered email is: ${data.email}`);
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. FORGOT PASSWORD (OTP) LOGIC ---
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    setIsLoading(true);

    const supabase = getSupabase();

    try {
      const { data, error: matchError } = await supabase
        .from('users')
        .select('id')
        .eq('reg', rollNumber)
        .eq('email', email)
        .single();

      if (matchError || !data) {
        setErrorMsg('Roll Number and Email combination not found.');
        setIsLoading(false);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
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
        className="absolute top-6 right-6 p-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl transition-colors duration-300 dark:bg-gray-800 dark:shadow-2xl">
        
        <div className="mb-8 text-center relative">
          {view !== 'login' && (
            <button 
              onClick={() => switchView(view === 'forgot_email' ? 'forgot_password' : 'login')}
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

        {/* VIEW 3: FOR short PASSWORD */}
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