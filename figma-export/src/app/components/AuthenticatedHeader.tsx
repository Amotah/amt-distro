import { Music, User, LogOut, Settings } from 'lucide-react';
import { useState } from 'react';

interface AuthenticatedHeaderProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  onLogout: () => void;
}

export function AuthenticatedHeader({ onNavigate, currentPage, onLogout }: AuthenticatedHeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <img
              src="/brand/amt-distro-wordmark.svg"
              alt="AMTDISTRO logo"
              className="h-10 w-auto object-contain"
            />
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              className="flex items-center gap-2"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <span>My Account</span>
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg">
                <div className="p-4">
                  <div className="text-sm font-bold">My Account</div>
                  <div className="mt-2">
                    <button
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                      onClick={() => onNavigate('dashboard')}
                    >
                      <Music className="w-4 h-4" />
                      Dashboard
                    </button>
                  </div>
                  <div className="mt-2">
                    <button
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                      onClick={() => onNavigate('catalog')}
                    >
                      <Music className="w-4 h-4" />
                      My Catalog
                    </button>
                  </div>
                  <div className="mt-2">
                    <button
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                      onClick={() => onNavigate('settings')}
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                  </div>
                  <div className="mt-2">
                    <button
                      className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                      onClick={() => onNavigate('profile')}
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                  </div>
                  <div className="mt-4 border-t border-gray-200 pt-2">
                    <button
                      className="flex items-center gap-2 text-red-600"
                      onClick={onLogout}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Log Out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}