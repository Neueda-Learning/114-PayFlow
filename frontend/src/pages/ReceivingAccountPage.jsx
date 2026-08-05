import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Landmark, Save, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { receivingAccountApi } from '../api/endpoints';
import Spinner from '../components/Spinner';

const UPI_REGEX = /^[\w.-]+@[\w.-]+$/;

function validateReceivingForm(form) {
  const acc = form.accountNumber.trim();
  if (!/^\d{6,20}$/.test(acc)) {
    return 'Account number must be between 6 and 20 numeric digits';
  }
  const upi = form.upiId.trim();
  if (!UPI_REGEX.test(upi)) {
    return 'UPI ID format is invalid (e.g. receiver@upi)';
  }
  const name = form.accountHolderName.trim();
  if (!name || name.length < 2) {
    return 'Receiver account holder name must be at least 2 characters';
  }
  return null;
}

export default function ReceivingAccountPage() {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ accountNumber: '', upiId: '', accountHolderName: '', ifscCode: 'HDFC0123456' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadReceivingAccounts();
  }, []);

  const loadReceivingAccounts = async () => {
    setFetching(true);
    try {
      const res = await receivingAccountApi.getAll();
      const list = Array.isArray(res.data.data) ? res.data.data : (res.data.data ? [res.data.data] : []);
      setAccounts(list);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load receiving accounts');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'accountNumber') {
      value = value.replace(/\D/g, '');
    } else if (name === 'upiId') {
      value = value.trim();
    } else if (name === 'ifscCode') {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationErr = validateReceivingForm(form);
    if (validationErr) {
      setError(validationErr);
      toast.error(validationErr);
      return;
    }

    setLoading(true);
    try {
      await receivingAccountApi.save(form);
      setSuccess('Receiver account added successfully');
      toast.success('Receiver account added successfully');
      setForm({ accountNumber: '', upiId: '', accountHolderName: '', ifscCode: 'HDFC0123456' });
      setShowAddForm(false);
      loadReceivingAccounts();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to save receiving account';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this receiving account?')) return;
    try {
      await receivingAccountApi.delete(id);
      toast.success('Receiving account deleted');
      loadReceivingAccounts();
    } catch (err) {
      toast.error('Failed to delete account');
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Destination Accounts</h1>
          <p className="text-sm text-slate-500 font-medium">Manage multiple configured receiving accounts for incoming payments</p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-bold shadow-subtle transition-colors"
        >
          <Plus size={16} />
          <span>{showAddForm ? 'Cancel' : 'Add Receiver Account'}</span>
        </button>
      </div>

      {error && <div className="bg-rose-50 text-rose-700 px-4 py-2.5 rounded text-sm border border-rose-200 font-bold">{error}</div>}
      {success && <div className="bg-emerald-50 text-emerald-700 px-4 py-2.5 rounded text-sm border border-emerald-200 font-bold">{success}</div>}

      {/* List of Configured Receiver Accounts */}
      {fetching ? (
        <div className="flex justify-center py-10 text-slate-400"><Spinner size={20} /></div>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-slate-500 font-medium bg-white p-6 rounded border text-center">No destination accounts configured.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((acc, index) => (
            <div key={acc.id || index} className="bg-white border border-slate-200 rounded-lg p-4 shadow-subtle space-y-2 relative">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="bg-blue-50 text-blue-600 p-2 rounded border border-blue-100">
                    <Landmark size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{acc.accountHolderName}</h3>
                    <p className="text-xs text-slate-500 font-mono">IFSC: {acc.ifscCode || 'HDFC0123456'}</p>
                  </div>
                </div>

                {accounts.length > 1 && (
                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Delete Account"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 font-bold block uppercase tracking-wider">Account Number</span>
                  <span className="font-mono font-bold text-slate-900">{acc.accountNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block uppercase tracking-wider">Receiver UPI ID</span>
                  <span className="font-mono font-bold text-slate-900">{acc.upiId}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-emerald-700 font-extrabold">Balance: INR {Number(acc.balance ?? 0).toLocaleString()}</span>
                {index === 0 && <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Primary</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Receiver Account Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-5 shadow-subtle space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Add New Receiver Account</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Receiver Account Holder Name</label>
              <input
                type="text"
                name="accountHolderName"
                value={form.accountHolderName}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                placeholder="e.g. PayFlow Treasury"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">IFSC Code</label>
              <input
                type="text"
                name="ifscCode"
                value={form.ifscCode}
                onChange={handleChange}
                required
                maxLength={11}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600 uppercase font-mono"
                placeholder="HDFC0123456"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Account Number (6-20 Digits)</label>
              <input
                type="text"
                name="accountNumber"
                value={form.accountNumber}
                onChange={handleChange}
                required
                maxLength={20}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                placeholder="Bank account number"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Receiver UPI ID</label>
              <input
                type="text"
                name="upiId"
                value={form.upiId}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                placeholder="receiver@upi"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded font-bold text-sm shadow-subtle disabled:opacity-50 transition-colors"
          >
            {loading ? <Spinner size={16} /> : <Save size={16} />}
            {loading ? 'Saving...' : 'Save Receiver Account'}
          </button>
        </form>
      )}
    </div>
  );
}
