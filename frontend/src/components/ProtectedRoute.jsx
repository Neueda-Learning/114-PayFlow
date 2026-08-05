import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-3 text-gray-400">
        <Spinner size={28} />
        <p className="text-sm">Loading...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  return <div className="animate-fade-in">{children}</div>;
}
