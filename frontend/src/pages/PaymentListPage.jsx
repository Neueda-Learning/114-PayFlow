import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { paymentApi } from '../api/endpoints';

export default function PaymentListPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, [statusFilter]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const res = statusFilter === 'ALL'
        ? await paymentApi.getAll()
        : await paymentApi.getByStatus(statusFilter);
      setPayments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load payments', err);
    } finally {
      setLoading(false);
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
        <Link
          to="/payments/create"
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          + New Payment
        </Link>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-4">
        {['ALL', 'CREATED', 'VALIDATED', 'SENT', 'COMPLETED', 'FAILED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border ${
              statusFilter === s
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <p className="px-4 py-6 text-gray-400 text-center">Loading...</p>
        ) : payments.length === 0 ? (
          <p className="px-4 py-6 text-gray-400 text-center">No payments found</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Sender</th>
                <th className="px-4 py-2 text-left">Receiver</th>
                <th className="px-4 py-2 text-left">Method</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Retries</th>
                <th className="px-4 py-2 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/payments/${p.id}`)}
                >
                  <td className="px-4 py-2">
                    <Link
                      to={`/payments/${p.id}`}
                      className="text-indigo-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      #{p.id}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{p.amount} {p.currency}</td>
                  <td className="px-4 py-2 text-gray-600">{p.senderAccount}</td>
                  <td className="px-4 py-2 text-gray-600">{p.receiverAccount}</td>
                  <td className="px-4 py-2">{p.paymentMethod}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{p.retryCount}</td>
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
