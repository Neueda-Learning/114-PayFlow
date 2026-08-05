import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { paymentApi } from '../api/endpoints';

export default function PaymentListPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const hasRangeFilters = minAmount || maxAmount || fromDate || toDate;

  const loadPayments = async () => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (hasRangeFilters) {
        const params = {};
        if (statusFilter !== 'ALL') params.status = statusFilter;
        if (minAmount) params.minAmount = minAmount;
        if (maxAmount) params.maxAmount = maxAmount;
        if (fromDate) params.from = `${fromDate}T00:00:00`;
        if (toDate) params.to = `${toDate}T23:59:59`;
        res = await paymentApi.search(params);
      } else {
        res = statusFilter === 'ALL'
          ? await paymentApi.getAll()
          : await paymentApi.getByStatus(statusFilter);
      }
      setPayments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load payments', err);
      setError(err.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const applyRangeFilters = (e) => {
    e.preventDefault();
    loadPayments();
  };

  const clearRangeFilters = () => {
    setMinAmount('');
    setMaxAmount('');
    setFromDate('');
    setToDate('');
    setTimeout(loadPayments, 0);
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

      {/* Amount & Date Range Filters */}
      <form
        onSubmit={applyRangeFilters}
        className="flex flex-wrap items-end gap-3 mb-4 bg-white rounded-lg border border-gray-100 p-3"
      >
        <div>
          <label className="block text-xs text-gray-500 mb-1">Min Amount</label>
          <input
            type="number"
            step="0.01"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="w-28 border border-gray-300 rounded-md px-2 py-1 text-sm"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Max Amount</label>
          <input
            type="number"
            step="0.01"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            className="w-28 border border-gray-300 rounded-md px-2 py-1 text-sm"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={clearRangeFilters}
          className="bg-white text-gray-600 border border-gray-300 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-gray-50"
        >
          Clear
        </button>
      </form>

      {error && (
        <p className="text-red-600 text-sm mb-4">{error}</p>
      )}

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
                <th className="px-4 py-2 text-left">Comment</th>
                <th className="px-4 py-2 text-left">Method</th>
                <th className="px-4 py-2 text-left">Status</th>
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
                  <td className="px-4 py-2 text-gray-600 min-w-[220px] whitespace-normal break-words" title={p.purpose || ''}>
                    {p.purpose || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-2">{p.paymentMethod}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(p.status)}`}>
                      {p.status}
                    </span>
                    {p.status === 'FAILED' && p.failureCode === 'PROCESSING_ERROR' && (
                      <span
                        title="Debited amount was automatically refunded"
                        className="ml-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"
                      >
                        ↩️ Refunded
                      </span>
                    )}
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
