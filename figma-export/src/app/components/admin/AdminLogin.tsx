import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAdmin } from '../../contexts/AdminContext';
import { Shield, Loader2, AlertCircle } from 'lucide-react';

export function AdminLogin() {
  const { login, isLoading } = useAdmin();
  const navigate = useNavigate();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(emailOrUsername, password);

      const mustChangePassword = sessionStorage.getItem('mustChangePassword') === 'true';
      if (mustChangePassword) {
        navigate('/admin/change-password');
        return;
      }

      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0B0F1A 0%, #1a1f3a 100%)',
      }}
    >
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #00E5FF 0%, transparent 70%)',
            animation: 'pulse 4s ease-in-out infinite',
          }}
        />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(circle, #7B61FF 0%, transparent 70%)',
            animation: 'pulse 6s ease-in-out infinite',
          }}
        />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <img
              src="/brand/amt-distro-wordmark.svg"
              alt="AMTDISTRO logo"
              className="h-12 w-auto object-contain"
            />
          </div>
          <div className="inline-block px-4 py-1.5 rounded-full mb-3"
            style={{
              backgroundColor: 'rgba(0, 229, 255, 0.1)',
              border: '1px solid rgba(0, 229, 255, 0.3)',
            }}
          >
            <p className="font-semibold text-sm flex items-center gap-2" style={{ color: '#00E5FF' }}>
              <Shield className="w-4 h-4" />
              Admin Control Panel
            </p>
          </div>
          <p style={{ color: '#A0A7B8' }}>
            Secure platform management
          </p>
        </div>

        {/* Login Form */}
        <div className="rounded-2xl p-8 border backdrop-blur-sm"
          style={{
            backgroundColor: 'rgba(18, 24, 38, 0.8)',
            borderColor: 'rgba(123, 97, 255, 0.2)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="px-4 py-3 rounded-lg text-sm flex items-start gap-2"
                style={{
                  backgroundColor: 'rgba(255, 82, 82, 0.1)',
                  border: '1px solid rgba(255, 82, 82, 0.3)',
                  color: '#FF5252',
                }}
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="emailOrUsername" className="block text-sm font-medium mb-2"
                style={{ color: '#A0A7B8' }}
              >
                Email or Username
              </label>
              <input
                id="emailOrUsername"
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg outline-none transition focus:ring-2"
                style={{
                  backgroundColor: 'rgba(11, 15, 26, 0.6)',
                  border: '1px solid rgba(123, 97, 255, 0.2)',
                  color: '#FFFFFF',
                }}
                placeholder="admin@amtdistro.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2"
                style={{ color: '#A0A7B8' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg outline-none transition focus:ring-2"
                style={{
                  backgroundColor: 'rgba(11, 15, 26, 0.6)',
                  border: '1px solid rgba(123, 97, 255, 0.2)',
                  color: '#FFFFFF',
                }}
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-3 font-semibold rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #00E5FF 0%, #7B61FF 100%)',
                color: '#0B0F1A',
                boxShadow: '0 0 20px rgba(0, 229, 255, 0.3)',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t"
            style={{ borderColor: 'rgba(123, 97, 255, 0.1)' }}
          >
            <div className="flex items-center justify-center gap-2 text-xs"
              style={{ color: '#A0A7B8' }}
            >
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#00FFA3' }} />
              Secured with RBAC & JWT
            </div>
            <p className="text-xs text-center mt-2" style={{ color: '#A0A7B8' }}>
              All actions are logged for audit compliance
            </p>
          </div>
        </div>

        {/* Dev Credentials */}
        <div className="mt-6 rounded-lg p-4 border"
          style={{
            backgroundColor: 'rgba(18, 24, 38, 0.5)',
            borderColor: 'rgba(123, 97, 255, 0.1)',
          }}
        >
          <p className="text-xs text-center" style={{ color: '#A0A7B8' }}>
            <span className="font-semibold" style={{ color: '#7B61FF' }}>Dev Mode:</span> admin / admin
          </p>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
