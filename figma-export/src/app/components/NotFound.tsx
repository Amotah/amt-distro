import { useNavigate } from 'react-router';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <AlertTriangle className="w-16 h-16 text-[#FF6B00]" />
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-4">Page Not Found</h2>
        
        <p className="text-[#B3B3B3] mb-8">
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Go to Home
          </button>
          
          <button
            onClick={() => navigate(-1)}
            className="w-full border border-[#333333] hover:border-[#FF6B00] text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-[#333333]">
          <p className="text-sm text-[#B3B3B3]">
            If you believe this is an error, please contact{' '}
            <a href="mailto:support@amtmusic.com" className="text-[#FF6B00] hover:underline">
              support@amtmusic.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
