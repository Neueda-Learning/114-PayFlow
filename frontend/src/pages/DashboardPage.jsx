import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { paymentApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, completed: 0, failed: 0, sent: 0 });
  const [recentPayments, setRecentPayments] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await paymentApi.getAll();
      const payments = res.data.data || [];
      setRecentPayments(payments.slice(0, 5));
      setStats({
        total: payments.length,
        completed: payments.filter(p => p.status === 'COMPLETED').length,
        failed: payments.filter(p => p.status === 'FAILED').length,
        sent: payments.filter(p => p.status === 'SENT').length,
      });
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    }
  };

  const statusColor = (status) => {
    const colors = {
      CREATED: 'bg-gray-100 text-gray-700',
      VALIDATED: 'bg-blue-100 text-blue-700',
      SENT: 'bg-yellow-100 text-yellow-700',
      COMPLETED: 'bg-green-100 text-green-700',
      FAILED: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Welcome back, {user?.fullName}
      </h1>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
        <p className="text-sm text-gray-500">Bank Account</p>
        <p className="text-base font-semibold text-gray-800">{user?.bankAccountNumber || '-'}</p>
        <p className="text-sm text-gray-500 mt-2">Available Balance</p>
        <p className="text-xl font-bold text-green-700">INR {user?.bankBalance ?? '-'}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">Total Payments</p>
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-green-100">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-red-100">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-yellow-100">
          <p className="text-sm text-gray-500">Sent</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.sent}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 mb-8">
        <Link
          to="/payments/create"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          + New Payment
        </Link>
        <Link
          to="/payments"
          className="bg-white text-gray-700 px-4 py-2 rounded-md text-sm font-medium border border-gray-300 hover:bg-gray-50"
        >
          View All Payments
        </Link>
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Recent Payments</h2>
        </div>
        {recentPayments.length === 0 ? (
          <p className="px-4 py-6 text-gray-400 text-center">No payments yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Method</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p) => (
                <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link to={`/payments/${p.id}`} className="text-indigo-600 hover:underline">
                      #{p.id}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{p.amount} {p.currency}</td>
                  <td className="px-4 py-2">{p.paymentMethod}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-400">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
