import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Plus, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { paymentApi } from '../api/endpoints';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';

const PAGE_SIZE = 10;

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
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadPayments();
    setPage(1);
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
      setPage(1);
    } catch (err) {
      console.error('Failed to load payments', err);
      const message = err.response?.data?.message || 'Failed to load payments';
      setError(message);
      toast.error(message);
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

  const totalPages = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));
  const pagedPayments = useMemo(
    () => payments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [payments, page]
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
        <Link
          to="/payments/create"
          className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-sky-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 shadow-md"
        >
          <Plus size={16} />
          New Payment
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
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700"
        >
          <Search size={14} />
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
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-soft border border-gray-100/70 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10 text-gray-400"><Spinner size={24} /></div>
        ) : payments.length === 0 ? (
          <EmptyState
            title="No payments found"
            message="Try adjusting your filters, or create a new payment."
            action={
              <Link to="/payments/create" className="text-indigo-600 text-sm font-medium hover:underline">
                + Create a payment
              </Link>
            }
          />
        ) : (
          <>
          {/* Mobile card list */}
          <div className="md:hidden divide-y divide-gray-50">
            {pagedPayments.map((p) => (
              <div
                key={p.id}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/payments/${p.id}`)}
              >
                <div className="flex items-center justify-between">
                  <Link
                    to={`/payments/${p.id}`}
                    className="text-indigo-600 font-medium text-sm hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    #{p.id}
                  </Link>
                  <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{p.amount} {p.currency}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 truncate">{p.senderAccount} to {p.receiverAccount}</p>
                {p.purpose && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.purpose}</p>}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">{p.paymentMethod} · {new Date(p.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={p.status} />
                    {p.status === 'FAILED' && p.failureCode === 'PROCESSING_ERROR' && (
                      <span
                        title="Debited amount was automatically refunded"
                        className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 whitespace-nowrap"
                      >
                        Refunded
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
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
              {pagedPayments.map((p) => (
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
                  <td className="px-4 py-2 whitespace-nowrap">{p.amount} {p.currency}</td>
                  <td className="px-4 py-2 text-gray-600">{p.senderAccount}</td>
                  <td className="px-4 py-2 text-gray-600">{p.receiverAccount}</td>
                  <td className="px-4 py-2 text-gray-600 min-w-[220px] whitespace-normal break-words" title={p.purpose || ''}>
                    {p.purpose || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-2">{p.paymentMethod}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={p.status} />
                    {p.status === 'FAILED' && p.failureCode === 'PROCESSING_ERROR' && (
                      <span
                        title="Debited amount was automatically refunded"
                        className="ml-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 whitespace-nowrap"
                      >
                        ↩️ Refunded
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          </>
        )}
      </div>

      {!loading && payments.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-400">
            Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, payments.length)} of {payments.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
