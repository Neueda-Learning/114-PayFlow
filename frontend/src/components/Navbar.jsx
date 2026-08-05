import { Menu, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onMenuClick }) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <header className="glass border-b border-gray-100 sticky top-0 z-30">
      <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
        <button
          className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-indigo-600 rounded-md hover:bg-gray-50"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        <div className="hidden lg:block">
          <p className="text-xs text-gray-400 leading-tight">Welcome back,</p>
          <p className="text-sm font-semibold text-gray-700 leading-tight">{user.fullName}</p>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-green-700 bg-green-50 border border-green-100 px-2.5 sm:px-3 py-1.5 rounded-full whitespace-nowrap">
            <Wallet size={14} />
            INR {user.bankBalance ?? '-'}
          </div>
          <div className="hidden sm:flex w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-white items-center justify-center text-sm font-semibold shrink-0">
            {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}

