import { useEffect, useState } from 'react';
import { receivingAccountApi } from '../api/endpoints';

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
    } catch (err) {
      const code = err.response?.data?.errorCode;
      const message = err.response?.data?.message || 'Failed to save receiving account';
      setError(code ? `${code}: ${message}` : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Receiving Account</h1>
      <p className="text-sm text-gray-500 mb-6">
        This is the account that will receive money whenever any payment is sent from FlowPay.
      </p>

      {current && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-4">
          <p className="text-xs text-gray-400 uppercase">Current Receiving Account</p>
          <p className="text-sm font-semibold text-gray-800">A/C: {current.accountNumber}</p>
          <p className="text-sm font-semibold text-gray-800">UPI: {current.upiId}</p>
          <p className="text-sm font-semibold text-gray-800">
            Balance: INR {Number(current.balance ?? 0).toLocaleString()}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-2 rounded mb-4 text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-2 rounded mb-4 text-sm">{success}</div>
      )}

      {!fetching && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 space-y-4">
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
            className="w-full bg-indigo-600 text-white py-2 rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Receiving Account'}
          </button>
        </form>
      )}
    </div>
  );
}
