import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Plus, ChevronLeft, ChevronRight, Search, Filter, Copy, RotateCcw, Download } from 'lucide-react';
import { paymentApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';

const PAGE_SIZE = 10;

export default function PaymentListPage() {
  const navigate = useNavigate();
  const { updateUserBankData } = useAuth();
  const [payments, setPayments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [rollbackLoadingId, setRollbackLoadingId] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadPayments();
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const hasRangeFilters = minAmount || maxAmount || fromDate || toDate;

  const validateRangeFilters = () => {
    if (minAmount && Number(minAmount) < 0) return 'Min amount cannot be negative';
    if (maxAmount && Number(maxAmount) < 0) return 'Max amount cannot be negative';
    if (minAmount && maxAmount && Number(minAmount) > Number(maxAmount)) {
      return 'Min amount cannot be greater than Max amount';
    }
    if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
      return 'From Date cannot be later than To Date';
    }
    return null;
  };

  const loadPayments = async () => {
    const rangeError = validateRangeFilters();
    if (rangeError) {
      setError(rangeError);
      toast.error(rangeError);
      return;
    }

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

  const handleRollback = async (e, id) => {
    e.stopPropagation();
    setRollbackLoadingId(id);
    try {
      const res = await paymentApi.rollback(id);
      updateUserBankData({ bankBalance: res.data.data.userBankBalance });
      toast.success(`Payment #${id} funds rolled back successfully!`);
      loadPayments();
    } catch (err) {
      const message = err.response?.data?.message || 'Rollback failed';
      toast.error(message);
    } finally {
      setRollbackLoadingId(null);
    }
  };

  const copyToClipboard = (e, text, label) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const exportToCSV = () => {
    if (payments.length === 0) {
      toast.error('No transactions available to export');
      return;
    }
    const headers = ['Payment ID,Amount,Currency,Method,Sender,Receiver,Purpose,Status,Created At'];
    const rows = payments.map(p => 
      `"${p.id}","${p.amount}","${p.currency}","${p.paymentMethod}","${p.senderAccount}","${p.receiverAccount}","${p.purpose || ''}","${p.status}","${p.createdAt}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PayFlow_Payments_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Report downloaded successfully');
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
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      {/* Header + Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments Registry</h1>
          <p className="text-sm text-slate-500 font-medium">View, search, filter, and export transaction records</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3.5 py-2 rounded text-sm font-bold transition-colors"
            title="Download CSV Report"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <Link
            to="/payments/create"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-bold shadow-subtle transition-colors"
          >
            <Plus size={16} />
            <span>New Payment</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-subtle space-y-3">
        {/* Status Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Status:</span>
          {['ALL', 'CREATED', 'VALIDATED', 'SENT', 'COMPLETED', 'FAILED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 text-white shadow-subtle'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Range Filters Form */}
        <form onSubmit={applyRangeFilters} className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold mr-1">
            <Filter size={14} />
            <span>Range Filters:</span>
          </div>
          <input
            type="number"
            step="0.01"
            min="0"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
            className="w-28 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-900 focus:border-blue-600"
            placeholder="Min Amount"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
            className="w-28 px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-900 focus:border-blue-600"
            placeholder="Max Amount"
          />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-900 focus:border-blue-600"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-900 focus:border-blue-600"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded text-xs font-bold transition-colors ml-auto"
          >
            <Search size={14} />
            Apply Filters
          </button>
          <button
            type="button"
            onClick={clearRangeFilters}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded text-xs font-bold transition-colors"
          >
            Clear
          </button>
        </form>
      </div>

      {error && <p className="text-sm text-rose-600 font-bold">{error}</p>}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-subtle overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10 text-slate-400"><Spinner size={20} /></div>
        ) : payments.length === 0 ? (
          <EmptyState
            title="No payments found"
            message="Adjust filters or initiate a new payment."
            action={
              <Link to="/payments/create" className="text-blue-600 text-sm font-bold hover:underline">
                + New Payment
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Sender</th>
                  <th className="px-4 py-3 text-left">Receiver</th>
                  <th className="px-4 py-3 text-left">Purpose</th>
                  <th className="px-4 py-3 text-left">Method</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions / Refund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {pagedPayments.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/payments/${p.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-blue-600 text-sm">#{p.id}</span>
                        <button
                          onClick={(e) => copyToClipboard(e, p.id, 'Payment ID')}
                          className="text-slate-400 hover:text-slate-700"
                          title="Copy Payment ID"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900 text-sm whitespace-nowrap">{p.amount} {p.currency}</td>
                    <td className="px-4 py-3 text-slate-700 font-semibold">{p.senderAccount}</td>
                    <td className="px-4 py-3 text-slate-700 font-semibold">{p.receiverAccount}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{p.purpose || '-'}</td>
                    <td className="px-4 py-3 text-slate-700 font-semibold">{p.paymentMethod}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.status === 'FAILED' ? (
                        p.refunded ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                            ↩️ Refunded
                          </span>
                        ) : (
                          <button
                            onClick={(e) => handleRollback(e, p.id)}
                            disabled={rollbackLoadingId === p.id}
                            className="inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded text-xs font-bold transition-colors disabled:opacity-50"
                            title="Rollback funds back to account"
                          >
                            {rollbackLoadingId === p.id ? <Spinner size={12} /> : <RotateCcw size={12} />}
                            <span>Rollback</span>
                          </button>
                        )
                      ) : (
                        <span className="text-slate-400 text-xs font-medium">{new Date(p.createdAt).toLocaleDateString()}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && payments.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-slate-600 font-medium">
            Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, payments.length)} of {payments.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-slate-800 font-bold">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
