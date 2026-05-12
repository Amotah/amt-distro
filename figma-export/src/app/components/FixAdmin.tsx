import { useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

export function FixAdmin() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFixAdmin = async () => {
    setIsLoading(true);
    setMessage('');
    setIsSuccess(false);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-79198001/init-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
        setMessage('✅ Admin account has been fixed! You can now login with:\nUsername: admin\nEmail: admin@amtdistro.com\nPassword: admin');
      } else {
        setIsSuccess(false);
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error: any) {
      setIsSuccess(false);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Fix Admin Account</h1>
        <p className="text-gray-600 mb-6">
          If you're seeing "Profile not found" when trying to login as admin, click the button below to fix the admin account.
        </p>

        <button
          onClick={handleFixAdmin}
          disabled={isLoading}
          className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Fixing Admin...' : 'Fix Admin Account'}
        </button>

        {message && (
          <div className={`mt-6 p-4 rounded-lg ${isSuccess ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className={`text-sm whitespace-pre-line ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>
              {message}
            </p>
            {isSuccess && (
              <a
                href="/login"
                className="mt-4 inline-block bg-purple-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Go to Login
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
