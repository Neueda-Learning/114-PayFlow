import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListOrdered, PlusCircle, Landmark, LogOut, X, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/payments', label: 'Payments', icon: ListOrdered },
  { to: '/payments/create', label: 'New Payment', icon: PlusCircle },
  { to: '/receiving-account', label: 'Destination Accounts', icon: Landmark },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/login');
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 text-slate-300 flex flex-col transform transition-transform duration-200 ease-in-out lg:static lg:z-0 lg:translate-x-0 lg:shrink-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Brand */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800 shrink-0">
          <NavLink to="/" className="flex items-center gap-2.5 min-w-0" onClick={onClose}>
            <div className="bg-blue-600 text-white rounded p-2 shrink-0">
              <Wallet size={18} />
            </div>
            <span className="text-lg font-bold text-white tracking-tight truncate">
              PayFlow
            </span>
          </NavLink>
          <button
            className="lg:hidden p-1 text-slate-400 hover:text-white rounded"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Main Menu</p>
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              <span className="truncate">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Account Summary & Logout */}
        <div className="p-3.5 border-t border-slate-800 space-y-3 shrink-0 bg-slate-950/50">
          <div className="rounded bg-slate-800/80 border border-slate-700/60 p-2.5 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Balance</span>
            <span className="text-sm font-bold text-emerald-400">INR {user.bankBalance ?? '-'}</span>
          </div>

          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
              {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-200 truncate">{user.fullName}</p>
              <p className="text-xs text-slate-400 truncate">A/C: {user.bankAccountNumber || '-'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 font-medium py-2 rounded transition-colors text-xs uppercase tracking-wider"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
