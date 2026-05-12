import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../../../utils/supabase/client';
import { Lock, CheckCircle, AlertTriangle } from 'lucide-react';
import { getDashboardPathForMode, getEffectiveDashboardMode } from '../../utils/dashboard-access';

export function ForceChangePassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  const minimum = 'Password@1';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!password || !confirm) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (password === '@Pass' || password === 'Password@1') {
      setError('New password must not be the default password. Choose a stronger password.');
      return;
    }

    setIsSaving(true);

    const { data, error: supabaseError } = await supabase.auth.updateUser({
      password,
      data: {
        mustChangePassword: false,
        temporaryPassword: false,
      },
    });

    if (supabaseError) {
      setError(supabaseError.message || 'Failed to update password.');
      setIsSaving(false);
      return;
    }

    sessionStorage.removeItem('mustChangePassword');
    setSuccess('Password updated successfully. Redirecting to dashboard...');

    setTimeout(() => {
      const mode = getEffectiveDashboardMode({
        role: data.user?.user_metadata?.role || sessionStorage.getItem('user_role'),
        subscriptionTier: data.user?.user_metadata?.subscriptionTier || sessionStorage.getItem('user_subscription_tier'),
      });

      const nextPath = mode === 'admin' ? '/admin' : getDashboardPathForMode(mode, '/dashboard');
      navigate(nextPath);
    }, 1200);

    setIsSaving(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F1A] p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-8 shadow-lg shadow-black/30">
        <h2 className="mb-2 text-2xl font-bold text-gray-950">Change Password</h2>
        <p className="mb-5 text-sm text-gray-600">
          For security, you must change the initial default password before continuing.
        </p>

        {error && (
          <div className="flex items-start gap-2 mb-4 text-red-700 bg-red-50 p-3 rounded-lg">
            <AlertTriangle className="w-4 h-4 mt-0.5" /> {error}
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 mb-4 text-green-700 bg-green-50 p-3 rounded-lg">
            <CheckCircle className="w-4 h-4 mt-0.5" /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a strong password"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm your password"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 italic">
            Password cannot be <strong>Password@1</strong> or <strong>@Pass</strong>.
          </p>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
