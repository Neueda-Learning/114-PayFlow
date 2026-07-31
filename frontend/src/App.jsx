import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CreatePaymentPage from './pages/CreatePaymentPage';
import PaymentListPage from './pages/PaymentListPage';
import PaymentDetailPage from './pages/PaymentDetailPage';
import ReceivingAccountPage from './pages/ReceivingAccountPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected */}
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><PaymentListPage /></ProtectedRoute>} />
          <Route path="/payments/create" element={<ProtectedRoute><CreatePaymentPage /></ProtectedRoute>} />
          <Route path="/payments/:id" element={<ProtectedRoute><PaymentDetailPage /></ProtectedRoute>} />
          <Route path="/receiving-account" element={<ProtectedRoute><ReceivingAccountPage /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
