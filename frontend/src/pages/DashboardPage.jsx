import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Wallet, Receipt, CheckCircle2, XCircle, Send, Plus, ListOrdered,
  ChevronDown, CreditCard, Landmark, Smartphone, PieChart as PieChartIcon,
} from 'lucide-react';
import { paymentApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';

const RANGE_OPTIONS = [
  { key: '24H', label: 'Last 24 Hours', hours: 24 },
  { key: '7D', label: 'Last 7 Days', hours: 24 * 7 },
  { key: '30D', label: 'Last 30 Days', hours: 24 * 30 },
];

const METHOD_META = {
  CARD: { label: 'Card', color: '#6366f1', icon: CreditCard },
  BANK_TRANSFER: { label: 'Bank Transfer', color: '#0ea5e9', icon: Landmark },
  UPI: { label: 'UPI', color: '#22c55e', icon: Smartphone },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, completed: 0, failed: 0, sent: 0 });
  const [allPayments, setAllPayments] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7D');
  const [rangeOpen, setRangeOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await paymentApi.getAll();
      const payments = res.data.data || [];
      setAllPayments(payments);
      setRecentPayments(payments.slice(0, 5));
      setStats({
        total: payments.length,
        completed: payments.filter(p => p.status === 'COMPLETED').length,
        failed: payments.filter(p => p.status === 'FAILED').length,
        sent: payments.filter(p => p.status === 'SENT').length,
      });
    } catch (err) {
      console.error('Failed to load dashboard data', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const selectedRange = RANGE_OPTIONS.find((r) => r.key === range) || RANGE_OPTIONS[1];

  const spendByMethod = useMemo(() => {
    const cutoff = Date.now() - selectedRange.hours * 60 * 60 * 1000;
    const totals = { CARD: 0, BANK_TRANSFER: 0, UPI: 0 };
    allPayments.forEach((p) => {
      if (p.status === 'FAILED') return; // refunded / never actually spent
      if (new Date(p.createdAt).getTime() < cutoff) return;
      if (totals[p.paymentMethod] !== undefined) {
        totals[p.paymentMethod] += Number(p.amount) || 0;
      }
    });
    return totals;
  }, [allPayments, selectedRange]);

  const pieData = Object.entries(spendByMethod)
    .map(([method, value]) => ({ name: METHOD_META[method].label, method, value }))
    .filter((d) => d.value > 0);

  const totalSpend = pieData.reduce((sum, d) => sum + d.value, 0);

  const statCards = [
    { label: 'Total Payments', value: stats.total, icon: Receipt, color: 'text-gray-800', ring: 'ring-gray-100' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-green-600', ring: 'ring-green-100' },
    { label: 'Failed', value: stats.failed, icon: XCircle, color: 'text-red-600', ring: 'ring-red-100' },
    { label: 'Sent', value: stats.sent, icon: Send, color: 'text-yellow-600', ring: 'ring-yellow-100' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome back, {user?.fullName}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Here's what's happening with your payments today.</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white p-5 rounded-xl shadow-md mb-6 flex items-center gap-4">
        <div className="bg-white/15 rounded-full p-3">
          <Wallet size={22} />
        </div>
        <div>
          <p className="text-sm text-indigo-100">Bank Account</p>
          <p className="text-base font-semibold">{user?.bankAccountNumber || '-'}</p>
          <p className="text-sm text-indigo-100 mt-2">Available Balance</p>
          <p className="text-xl font-bold">INR {user?.bankBalance ?? '-'}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, ring }) => (
          <div key={label} className={`bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-soft ring-1 ${ring} hover:shadow-card hover:-translate-y-0.5 transition-all`}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{label}</p>
              <Icon size={16} className={color} />
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          to="/payments/create"
          className="flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-sky-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 shadow-md"
        >
          <Plus size={16} />
          New Payment
        </Link>
        <Link
          to="/payments"
          className="flex items-center gap-1.5 bg-white text-gray-700 px-4 py-2 rounded-md text-sm font-medium border border-gray-300 hover:bg-gray-50"
        >
          <ListOrdered size={16} />
          View All Payments
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Spend by Method Pie Chart */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-soft border border-gray-100/70 p-5 lg:col-span-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <PieChartIcon size={16} className="text-indigo-500" />
              <h2 className="font-semibold text-gray-700">Spend by Method</h2>
            </div>

            {/* Range Dropdown */}
            <div className="relative">
              <button
                onClick={() => setRangeOpen((v) => !v)}
                className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                {selectedRange.label}
                <ChevronDown size={12} className={`transition-transform ${rangeOpen ? 'rotate-180' : ''}`} />
              </button>
              {rangeOpen && (
                <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-100 rounded-lg shadow-lg z-20 overflow-hidden animate-fade-in">
                  {RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setRange(opt.key); setRangeOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 ${
                        opt.key === range ? 'text-indigo-600 font-medium bg-indigo-50' : 'text-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-3">{selectedRange.label}</p>

          {loading ? (
            <div className="flex justify-center py-10 text-gray-400"><Spinner size={22} /></div>
          ) : pieData.length === 0 ? (
            <EmptyState
              icon={PieChartIcon}
              title="No spend yet"
              message={`No payments recorded in the ${selectedRange.label.toLowerCase()}.`}
            />
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {pieData.map((d) => (
                        <Cell key={d.method} fill={METHOD_META[d.method].color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`INR ${value.toLocaleString()}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-2">
                {pieData.map((d) => {
                  const Icon = METHOD_META[d.method].icon;
                  const pct = totalSpend ? ((d.value / totalSpend) * 100).toFixed(1) : 0;
                  return (
                    <div key={d.method} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-600">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: METHOD_META[d.method].color }} />
                        <Icon size={14} />
                        {d.name}
                      </span>
                      <span className="font-medium text-gray-700">
                        INR {d.value.toLocaleString()} <span className="text-gray-400">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100 mt-2">
                  <span className="text-gray-500 font-medium">Total</span>
                  <span className="font-semibold text-gray-800">INR {totalSpend.toLocaleString()}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-soft border border-gray-100/70 lg:col-span-2">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">Recent Payments</h2>
            <Link to="/payments" className="text-xs text-indigo-600 hover:underline font-medium">View all</Link>
          </div>
          {loading ? (
            <div className="flex justify-center py-10 text-gray-400"><Spinner size={24} /></div>
          ) : recentPayments.length === 0 ? (
            <EmptyState
              title="No payments yet"
              message="Create your first payment to see it appear here."
              action={
                <Link to="/payments/create" className="text-indigo-600 text-sm font-medium hover:underline">
                  + Create a payment
                </Link>
              }
            />
          ) : (
            <>
            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-gray-50">
              {recentPayments.map((p) => (
                <Link
                  key={p.id}
                  to={`/payments/${p.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="text-indigo-600 font-medium text-sm">#{p.id}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.paymentMethod} · {new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">{p.amount} {p.currency}</span>
                    <StatusBadge status={p.status} />
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
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
                    <td className="px-4 py-2 whitespace-nowrap">{p.amount} {p.currency}</td>
                    <td className="px-4 py-2">{p.paymentMethod}</td>
                    <td className="px-4 py-2">
                      <StatusBadge status={p.status} />
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
      </div>
    </div>
  );
}

