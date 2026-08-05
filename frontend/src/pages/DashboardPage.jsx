import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AreaChart, Area, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis, Legend } from 'recharts';
import {
  Wallet, Receipt, CheckCircle2, XCircle, Send, Plus, ListOrdered,
  CreditCard, Landmark, Smartphone, PieChart as PieChartIcon, TrendingUp, Copy, ArrowUpRight
} from 'lucide-react';
import { paymentApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';

const RANGE_OPTIONS = [
  { key: '24H', label: '24 Hours', hours: 24 },
  { key: '7D', label: '7 Days', hours: 24 * 7 },
  { key: '30D', label: '30 Days', hours: 24 * 30 },
];

const METHOD_META = {
  CARD: { label: 'Card Payment', color: '#2563eb', icon: CreditCard },
  BANK_TRANSFER: { label: 'Account Transfer', color: '#0284c7', icon: Landmark },
  UPI: { label: 'UPI Payment', color: '#16a34a', icon: Smartphone },
};

function MiniSparkline({ color = '#2563eb', data = [3, 7, 5, 9, 6, 12, 10] }) {
  const min = Math.min(...data);
  const max = Math.max(...data) || 1;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * 48;
      const y = 16 - ((val - min) / (max - min || 1)) * 14;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className="w-14 h-5 overflow-visible" viewBox="0 0 48 16">
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, completed: 0, failed: 0, sent: 0 });
  const [allPayments, setAllPayments] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30D');
  const [activeChartTab, setActiveChartTab] = useState('TREND');
  const [searchTerm, setSearchTerm] = useState('');

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

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const selectedRange = RANGE_OPTIONS.find((r) => r.key === range) || RANGE_OPTIONS[2];

  // Aggregated trend data including Account Transfer, Card, and UPI
  const trendData = useMemo(() => {
    const cutoff = Date.now() - selectedRange.hours * 60 * 60 * 1000;
    const filtered = allPayments.filter(p => new Date(p.createdAt).getTime() >= cutoff);

    const map = {};
    filtered.forEach(p => {
      const dateStr = new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      if (!map[dateStr]) {
        map[dateStr] = { date: dateStr, CARD: 0, BANK_TRANSFER: 0, UPI: 0, total: 0 };
      }
      const amt = Number(p.amount) || 0;
      const method = p.paymentMethod || 'BANK_TRANSFER';
      if (map[dateStr][method] !== undefined) {
        map[dateStr][method] += amt;
      }
      map[dateStr].total += amt;
    });

    const entries = Object.values(map);
    if (entries.length === 0) {
      return [
        { date: 'Today', CARD: 0, BANK_TRANSFER: 0, UPI: 0, total: 0 },
      ];
    }
    return entries;
  }, [allPayments, selectedRange]);

  const spendByMethod = useMemo(() => {
    const cutoff = Date.now() - selectedRange.hours * 60 * 60 * 1000;
    const totals = { CARD: 0, BANK_TRANSFER: 0, UPI: 0 };
    allPayments.forEach((p) => {
      if (new Date(p.createdAt).getTime() < cutoff) return;
      const method = p.paymentMethod || 'BANK_TRANSFER';
      if (totals[method] !== undefined) {
        totals[method] += Number(p.amount) || 0;
      }
    });
    return totals;
  }, [allPayments, selectedRange]);

  const pieData = Object.entries(spendByMethod)
    .map(([method, value]) => ({ name: METHOD_META[method]?.label || method, method, value }))
    .filter((d) => d.value >= 0);

  const totalSpend = Object.values(spendByMethod).reduce((sum, v) => sum + v, 0);

  const statusPercentages = useMemo(() => {
    if (!stats.total) return { completed: 0, sent: 0, failed: 0, created: 0 };
    return {
      completed: ((stats.completed / stats.total) * 100).toFixed(1),
      sent: ((stats.sent / stats.total) * 100).toFixed(1),
      failed: ((stats.failed / stats.total) * 100).toFixed(1),
      created: (((stats.total - stats.completed - stats.sent - stats.failed) / stats.total) * 100).toFixed(1),
    };
  }, [stats]);

  const filteredRecentPayments = useMemo(() => {
    if (!searchTerm.trim()) return recentPayments;
    const term = searchTerm.toLowerCase();
    return recentPayments.filter(p => 
      String(p.id).includes(term) ||
      p.paymentMethod?.toLowerCase().includes(term) ||
      p.status?.toLowerCase().includes(term) ||
      String(p.amount).includes(term)
    );
  }, [recentPayments, searchTerm]);

  const statCards = [
    { label: 'Total Volume', value: stats.total, icon: Receipt, textColor: 'text-slate-900', borderColor: 'border-slate-200', sparkColor: '#2563eb', sparkData: [4, 8, 6, 10, 9, 14, stats.total || 12], change: 'Live Synced' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, textColor: 'text-emerald-700', borderColor: 'border-emerald-200', sparkColor: '#16a34a', sparkData: [3, 5, 4, 8, 7, 11, stats.completed || 9], change: `${statusPercentages.completed}% Rate` },
    { label: 'Failed', value: stats.failed, icon: XCircle, textColor: 'text-rose-700', borderColor: 'border-rose-200', sparkColor: '#e11d48', sparkData: [1, 2, 0, 3, 1, 2, stats.failed || 1], change: `${statusPercentages.failed}% Rate` },
    { label: 'Sent', value: stats.sent, icon: Send, textColor: 'text-amber-700', borderColor: 'border-amber-200', sparkColor: '#d97706', sparkData: [2, 4, 3, 5, 4, 6, stats.sent || 4], change: `${statusPercentages.sent}% Processing` },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Banner: Account summary */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-blue-50 text-blue-600 rounded p-3 border border-blue-100 shrink-0">
            <Wallet size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 font-medium">Bank Account:</span>
              <span className="text-sm font-bold text-slate-900 font-mono tracking-wide">{user?.bankAccountNumber || '-'}</span>
              {user?.bankAccountNumber && (
                <button
                  onClick={() => copyToClipboard(user.bankAccountNumber, 'Account number')}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                  title="Copy Account Number"
                >
                  <Copy size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-slate-500 font-medium">Available Balance:</span>
              <span className="text-base font-extrabold text-emerald-700">INR {user?.bankBalance ?? '-'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/payments/create"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-bold shadow-subtle transition-all active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>New Payment</span>
          </Link>
          <Link
            to="/payments"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2 rounded text-sm font-bold transition-all"
          >
            <ListOrdered size={16} />
            <span>All Payments</span>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {statCards.map(({ label, value, textColor, borderColor, sparkColor, sparkData, change }) => (
          <div key={label} className={`bg-white p-4 rounded-lg border ${borderColor} shadow-subtle flex items-center justify-between hover:border-slate-300 transition-colors`}>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
              <p className={`text-2xl font-bold ${textColor} mt-1`}>{value}</p>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">{change}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <MiniSparkline color={sparkColor} data={sparkData} />
              <span className="text-xs font-bold text-slate-400 uppercase">30D Trend</span>
            </div>
          </div>
        ))}
      </div>

      {/* Status Distribution Bar */}
      {stats.total > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-subtle space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>TRANSACTION STATUS BREAKDOWN</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-emerald-700"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Completed {statusPercentages.completed}%</span>
              <span className="flex items-center gap-1.5 text-amber-700"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Sent {statusPercentages.sent}%</span>
              <span className="flex items-center gap-1.5 text-rose-700"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" />Failed {statusPercentages.failed}%</span>
            </div>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
            <div style={{ width: `${statusPercentages.completed}%` }} className="bg-emerald-500 h-full" title={`Completed ${statusPercentages.completed}%`} />
            <div style={{ width: `${statusPercentages.sent}%` }} className="bg-amber-500 h-full" title={`Sent ${statusPercentages.sent}%`} />
            <div style={{ width: `${statusPercentages.failed}%` }} className="bg-rose-500 h-full" title={`Failed ${statusPercentages.failed}%`} />
            <div style={{ width: `${statusPercentages.created}%` }} className="bg-slate-300 h-full" title={`Created ${statusPercentages.created}%`} />
          </div>
        </div>
      )}

      {/* Grid: Charts + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart Card */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-subtle p-4 lg:col-span-1 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded border border-slate-200">
              <button
                onClick={() => setActiveChartTab('TREND')}
                className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                  activeChartTab === 'TREND' ? 'bg-white text-blue-600 shadow-subtle' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Volume Trend
              </button>
              <button
                onClick={() => setActiveChartTab('DISTRIBUTION')}
                className={`px-2.5 py-1 text-xs font-bold rounded transition-colors ${
                  activeChartTab === 'DISTRIBUTION' ? 'bg-white text-blue-600 shadow-subtle' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Method Share
              </button>
            </div>

            {/* Range Toggle */}
            <div className="flex bg-slate-100 p-1 rounded border border-slate-200">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setRange(opt.key)}
                  className={`px-2 py-0.5 text-xs font-bold rounded transition-colors ${
                    opt.key === range ? 'bg-white text-blue-600 shadow-subtle' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.key}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8 text-slate-400"><Spinner size={20} /></div>
          ) : activeChartTab === 'TREND' ? (
            <div className="space-y-2">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorBank" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorCard" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorUpi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(val, name) => [`INR ${val.toLocaleString()}`, METHOD_META[name]?.label || name]} />
                    <Area type="monotone" dataKey="BANK_TRANSFER" name="Account Transfer" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorBank)" />
                    <Area type="monotone" dataKey="CARD" name="Card Payment" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorCard)" />
                    <Area type="monotone" dataKey="UPI" name="UPI Payment" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#colorUpi)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-600 font-semibold">
                <span>Total Period Volume</span>
                <span className="font-bold text-slate-900">INR {totalSpend.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} paddingAngle={2}>
                      {pieData.map((d) => (
                        <Cell key={d.method} fill={METHOD_META[d.method]?.color || '#0284c7'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [`INR ${val.toLocaleString()}`, 'Volume']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                {pieData.map((d) => {
                  const pct = totalSpend ? ((d.value / totalSpend) * 100).toFixed(1) : 0;
                  const meta = METHOD_META[d.method] || { label: d.method, color: '#0284c7', icon: Landmark };
                  const Icon = meta.icon;
                  return (
                    <div key={d.method} className="flex items-center justify-between text-slate-700 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                        <Icon size={14} />
                        {meta.label}
                      </span>
                      <span className="font-bold text-slate-900">INR {d.value.toLocaleString()} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-subtle lg:col-span-2 flex flex-col justify-between">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-600" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Operations</h2>
            </div>
            
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter recent..."
                className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:outline-none focus:border-blue-600"
              />
              <Link to="/payments" className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline shrink-0 flex items-center gap-0.5">
                View All <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-8 text-slate-400"><Spinner size={20} /></div>
            ) : filteredRecentPayments.length === 0 ? (
              <EmptyState title="No Matching Activity" message="Try clearing your search term or initialize a new payment." />
            ) : (
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5 text-left">ID</th>
                    <th className="px-4 py-2.5 text-left">Amount</th>
                    <th className="px-4 py-2.5 text-left">Method</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredRecentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Link to={`/payments/${p.id}`} className="font-bold text-blue-600 hover:underline">
                            #{p.id}
                          </Link>
                          <button
                            onClick={() => copyToClipboard(p.id, 'Payment ID')}
                            className="text-slate-400 hover:text-slate-700"
                            title="Copy ID"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap">{p.amount} {p.currency}</td>
                      <td className="px-4 py-2.5 text-slate-700 font-semibold">
                        {p.paymentMethod === 'BANK_TRANSFER' ? 'Account Transfer' : p.paymentMethod === 'CARD' ? 'Card Payment' : 'UPI Payment'}
                      </td>
                      <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
