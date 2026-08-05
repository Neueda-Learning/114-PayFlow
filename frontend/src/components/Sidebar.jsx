import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ListOrdered, PlusCircle, Landmark, LogOut, X, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/payments', label: 'Payments', icon: ListOrdered },
  { to: '/payments/create', label: 'New Payment', icon: PlusCircle },
  { to: '/receiving-account', label: 'Receiving Account', icon: Landmark },
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
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 glass border-r border-gray-100 flex flex-col transform transition-transform duration-300 ease-out lg:static lg:z-0 lg:translate-x-0 lg:w-64 lg:shrink-0 ${
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 shrink-0">
          <NavLink to="/" className="flex items-center gap-2 min-w-0" onClick={onClose}>
            <span className="bg-gradient-to-br from-indigo-600 to-sky-500 text-white rounded-lg p-1.5 shadow-md shrink-0">
              <Wallet size={18} />
            </span>
            <span className="text-lg font-extrabold bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent truncate">
              PayFlow
            </span>
          </NavLink>
          <button
            className="lg:hidden p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          <p className="px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-50 to-sky-50 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gradient-to-b from-indigo-600 to-sky-500" />
                  )}
                  <Icon size={18} className="shrink-0" />
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100 space-y-3 shrink-0">
          <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-100 px-3 py-2">
            <span className="text-xs text-green-700 font-medium">Balance</span>
            <span className="text-xs text-green-700 font-semibold">INR {user.bankBalance ?? '-'}</span>
          </div>
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 text-white flex items-center justify-center text-xs font-semibold shrink-0">
              {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{user.fullName}</p>
              <p className="text-[11px] text-gray-400 truncate">A/C: {user.bankAccountNumber || '-'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:text-white hover:bg-red-500 border border-red-100 hover:border-red-500 font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
