'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Loader2, Sun, Moon, Phone, User, ArrowLeft, ShieldCheck } from 'lucide-react';

type ViewState = 'login' | 'signup' | 'forgot_password' | 'forgot_email';

export default function LoginPage() {
  const [view, setView] = useState<ViewState>('login');
  const [rollNumber, setRollNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Helper to initialize Supabase
  const getSupabase = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    return createClient(supabaseUrl, supabaseKey);
  };

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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 4) value = value.substring(0, 4) + '-' + value.substring(4, 11);
    setPhone(value);
  };

  const switchView = (newView: ViewState) => {
    setErrorMsg('');
    setSuccessMsg('');
    setView(newView);
  };

  // --- 1. LOGIN (Existing Logic) ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    const supabase = getSupabase();

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('reg', rollNumber)
        .eq('pass', password)
        .single();

      if (error || !data) {
        setErrorMsg('Invalid Roll Number or Password.');
      } else {
        setSuccessMsg('Login successful!');
      }
    } catch (err) {
      setErrorMsg('An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. SIGN UP (Integrated with Supabase Auth OTP) ---
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      setErrorMsg('Only @gmail.com is allowed.');
      return;
    }
    const rawNum = phone.replace(/-/g, '');
    if (!rawNum.startsWith('03') || rawNum.length !== 11) {
      setErrorMsg('you entering wrong number.. enter your correct number otherwise your account can be compromised');
      return;
    }

    setIsLoading(true);
    const supabase = getSupabase();

    try {
      // Create user in Supabase Auth (This sends the OTP/Verification Link)
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { roll_number: rollNumber, phone: phone } }
      });

      if (authError) throw authError;

      // Also save to your custom table for your records
      await supabase.from('users').insert([{ reg: rollNumber, phone, email, pass: password }]);

      setSuccessMsg('Verification OTP sent to your Gmail!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Signup failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. FORGOT EMAIL ---
  const handleForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    const supabase = getSupabase();
    try {
      const { data, error } = await supabase.from('users').select('email').eq('phone', phone).single();
      if (error || !data) setErrorMsg('Phone number not found.');
      else setSuccessMsg(`Your email is: ${data.email}`);
    } catch (err) { setErrorMsg('Error finding email.'); }
    finally { setIsLoading(false); }
  };

  // --- 4. FORGOT PASSWORD (OTP) ---
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);
    const supabase = getSupabase();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setSuccessMsg('Password reset OTP sent to your email!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#fbfbfd] transition-colors duration-500 dark:bg-[#000000] p-6">
      
      {/* Theme Toggle */}
      <button onClick={toggleTheme} className="absolute top-8 right-8 p-3 rounded-full bg-white/80 dark:bg-white/10 backdrop-blur-md shadow-sm border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white transition-all active:scale-95">
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[360px] bg-white dark:bg-[#1c1c1e] p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-white/5"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className="mb-8 text-center relative">
              {view !== 'login' && (
                <button onClick={() => switchView(view === 'forgot_email' ? 'forgot_password' : 'login')} className="absolute left-0 top-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                  <ArrowLeft size={20} />
                </button>
              )}
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {view === 'login' && 'Sign In'}
                {view === 'signup' && 'Register'}
                {view === 'forgot_password' && 'Reset'}
                {view === 'forgot_email' && 'Find Email'}
              </h2>
            </div>

            {/* Messages */}
            {errorMsg && <div className="mb-4 text-[13px] bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-2xl border border-red-100 dark:border-red-500/20">{errorMsg}</div>}
            {successMsg && <div className="mb-4 text-[13px] bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 p-3 rounded-2xl border border-green-100 dark:border-green-500/20">{successMsg}</div>}

            <form onSubmit={
              view === 'login' ? handleLogin : 
              view === 'signup' ? handleSignup : 
              view === 'forgot_email' ? handleForgotEmail : handleForgotPassword
            } className="space-y-4">
              
              {(view === 'login' || view === 'signup' || view === 'forgot_password') && (
                <div className="group relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    type="text" value={rollNumber} onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                    placeholder="Roll Number" required
                    className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl pl-12 pr-4 py-3.5 text-[15px] outline-none ring-1 ring-gray-200 dark:ring-white/10 focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                  />
                </div>
              )}

              {(view === 'signup' || view === 'forgot_email') && (
                <div className="group relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    type="tel" value={phone} onChange={handlePhoneChange}
                    placeholder="0300-1234567" maxLength={12} required
                    className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl pl-12 pr-4 py-3.5 text-[15px] outline-none ring-1 ring-gray-200 dark:ring-white/10 focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                  />
                </div>
              )}

              {(view === 'signup' || view === 'forgot_password') && (
                <div className="group relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="Gmail Address" required
                    className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl pl-12 pr-4 py-3.5 text-[15px] outline-none ring-1 ring-gray-200 dark:ring-white/10 focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                  />
                </div>
              )}

              {(view === 'login' || view === 'signup') && (
                <div className="group relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password" required
                    className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl pl-12 pr-4 py-3.5 text-[15px] outline-none ring-1 ring-gray-200 dark:ring-white/10 focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                  />
                </div>
              )}

              <button 
                type="submit" disabled={isLoading} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] flex justify-center items-center gap-2"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                  <>
                    {view === 'login' && 'Sign In'}
                    {view === 'signup' && 'Register'}
                    {view === 'forgot_password' && 'Send OTP'}
                    {view === 'forgot_email' && 'Find Email'}
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center space-y-4">
              {view === 'login' && (
                <>
                  <button onClick={() => switchView('forgot_password')} className="text-[13px] text-gray-400 hover:text-blue-500 transition-colors">Forgot Password?</button>
                  <div className="h-[1px] w-full bg-gray-100 dark:bg-white/5" />
                  <p className="text-[13px] text-gray-400">New here? <button onClick={() => switchView('signup')} className="text-blue-600 font-bold ml-1">Create Account</button></p>
                </>
              )}
              {view === 'forgot_password' && (
                <button onClick={() => switchView('forgot_email')} className="text-[13px] text-blue-600 font-bold">Find my Email address</button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}