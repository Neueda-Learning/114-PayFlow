import { Menu, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ onMenuClick }) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 h-16 shrink-0">
      <div className="flex items-center justify-between px-5 h-full max-w-7xl mx-auto">
        <button
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded hover:bg-slate-100"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        <div className="hidden lg:block">
          <span className="text-sm font-semibold text-slate-500">Welcome, </span>
          <span className="text-sm font-bold text-slate-900">{user.fullName}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded">
            <Wallet size={16} />
            <span>Balance: INR {user.bankBalance ?? '-'}</span>
          </div>
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center text-sm font-bold shrink-0">
            {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
