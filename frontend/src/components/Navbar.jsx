import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-indigo-600">
          FlowPay
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-600 hover:text-indigo-600 text-sm font-medium">
            Dashboard
          </Link>
          <Link to="/payments" className="text-gray-600 hover:text-indigo-600 text-sm font-medium">
            Payments
          </Link>
          <Link to="/payments/create" className="text-gray-600 hover:text-indigo-600 text-sm font-medium">
            New Payment
          </Link>
          <span className="text-sm text-gray-400">|</span>
          <span className="text-sm text-gray-500">{user.fullName}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-700 font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
