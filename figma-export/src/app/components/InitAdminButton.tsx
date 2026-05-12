import { useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Button } from './ui/button';
import { Loader2, Shield, CheckCircle, AlertCircle } from 'lucide-react';

export function InitAdminButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleInitAdmin = async () => {
    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-79198001/init-admin`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setMessage('Admin user created successfully! You can now login with: admin / admin');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to initialize admin user');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Network error. Please check your server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <div>
            <h4 className="font-semibold text-sm">Admin Setup</h4>
            <p className="text-xs text-gray-600">Initialize test admin account</p>
          </div>
        </div>

        {status === 'success' && (
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">Success!</p>
                <p className="text-xs">{message}</p>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">Error</p>
                <p className="text-xs">{message}</p>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleInitAdmin}
          disabled={isLoading}
          size="sm"
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Admin...
            </>
          ) : (
            'Create Admin Account'
          )}
        </Button>

        {status === 'idle' && (
          <p className="text-xs text-gray-500 mt-2 text-center">
            Click if you're getting login errors
          </p>
        )}
      </div>
    </div>
  );
}
