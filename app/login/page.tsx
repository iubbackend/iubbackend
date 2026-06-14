'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
// Ensure you have NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [phoneError, setPhoneError] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle phone input formatting (adds the hyphen automatically)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Insert hyphen after the 4th digit
    if (value.length > 4) {
      value = value.substring(0, 4) + '-' + value.substring(4, 11);
    }
    
    setPhone(value);
    setPhoneError(false); // Clear custom error when user starts typing again
  };

  // Handle Form Submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(''); // Clear previous auth errors
    
    const rawNumber = phone.replace(/-/g, ''); // Remove hyphen for strict validation

    // Validation Check: Must start with '03' and be 11 digits
    if (!rawNumber.startsWith('03') || rawNumber.length !== 11) {
      setPhoneError(true);
      return;
    }

    setIsLoading(true);

    try {
      // Query the custom 'users' table
      const { data, error } = await supabase
        .from('users')
        .select('id, reg, email, phone, created_at')
        .eq('phone', phone) // Checking against formatted phone like '0300-1234567'
        .eq('pass', password)
        .single();

      if (error || !data) {
        setAuthError('Invalid phone number or password.');
        setIsLoading(false);
        return;
      }

      // Success! 
      alert('Login successful! Welcome back.');
      console.log('User Data:', data);
      
      // Redirect to a secure page (uncomment and modify to your actual dashboard route)
      // router.push('/dashboard');

    } catch (err) {
      console.error('Login error:', err);
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-800">Log In</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Phone Input Area */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="0300-1234567"
              maxLength={12}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {/* Custom Warning Error */}
            {phoneError && (
              <p className="mt-2 text-sm text-red-600 font-semibold">
                you entering wrong number.. enter your correct number otherwise your account can be compromised
              </p>
            )}
          </div>

          {/* Password Input Area */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* General Auth Error (Database rejection) */}
          {authError && (
            <p className="text-sm text-red-600">{authError}</p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
          
        </form>
      </div>
    </div>
  );
}
