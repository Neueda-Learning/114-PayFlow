import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { Landmark, Save } from 'lucide-react';
import { receivingAccountApi } from '../api/endpoints';
import Spinner from '../components/Spinner';

export default function ReceivingAccountPage() {
  const [form, setForm] = useState({ accountNumber: '', upiId: '' });
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await receivingAccountApi.get();
        if (!cancelled) {
          setCurrent(res.data.data);
          setForm({
            accountNumber: res.data.data.accountNumber || '',
            upiId: res.data.data.upiId || '',
          });
        }
      } catch (err) {
        // No receiving account configured yet — that's fine, just leave the form empty.
        if (!cancelled && err.response?.status !== 404) {
          setError(err.response?.data?.message || 'Failed to load receiving account');
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await receivingAccountApi.save(form);
      setCurrent(res.data.data);
      setSuccess('Receiving account saved successfully');
      toast.success('Receiving account saved successfully');
    } catch (err) {
      const code = err.response?.data?.errorCode;
      const message = err.response?.data?.message || 'Failed to save receiving account';
      const fullMessage = code ? `${code}: ${message}` : message;
      setError(fullMessage);
      toast.error(fullMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Receiving Account</h1>
      <p className="text-sm text-gray-500 mb-6">
        This is the account that will receive money whenever any payment is sent from PayFlow.
      </p>

      {current && (
        <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-soft border border-gray-100/70 mb-4 flex items-center gap-4">
          <div className="bg-indigo-50 text-indigo-600 rounded-full p-3">
            <Landmark size={20} />
          </div>
          <div>
          <p className="text-xs text-gray-400 uppercase">Current Receiving Account</p>
          <p className="text-sm font-semibold text-gray-800">A/C: {current.accountNumber}</p>
          <p className="text-sm font-semibold text-gray-800">UPI: {current.upiId}</p>
          <p className="text-sm font-semibold text-gray-800">
            Balance: INR {Number(current.balance ?? 0).toLocaleString()}
          </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-2 rounded mb-4 text-sm border border-red-100">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded mb-4 text-sm border border-green-100">{success}</div>
      )}

      {fetching ? (
        <div className="flex justify-center py-10 text-gray-400"><Spinner size={24} /></div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-soft border border-gray-100/70 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input
              type="text"
              name="accountNumber"
              value={form.accountNumber}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Bank account number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
            <input
              type="text"
              name="upiId"
              value={form.upiId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="receiver@upi"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? <Spinner size={16} /> : <Save size={16} />}
            {loading ? 'Saving...' : 'Save Receiving Account'}
          </button>
        </form>
      )}
    </div>
  );
}
