import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Wallet, AlertTriangle, Send } from 'lucide-react';
import { paymentApi, receivingAccountApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_REGEX = /^[\w.+-]+@[\w.-]+$/;
const EXPIRY_REGEX = /^(0[1-9]|1[0-2])\/\d{2}$/;

function validateForm(form) {
  if (!form.amount || parseFloat(form.amount) <= 0) return 'Enter a valid amount greater than 0';
  if (!form.purpose.trim()) return 'Purpose / comment is required';

  if (form.paymentMethod === 'CARD') {
    if (!/^\d{12,19}$/.test(form.senderAccount.replace(/\s/g, ''))) return 'Card number must be 12-19 digits';
    if (!EXPIRY_REGEX.test(form.cardExpiry)) return 'Card expiry must be in MM/YY format';
    if (!/^\d{3,4}$/.test(form.cardCvv)) return 'CVV must be 3 or 4 digits';
  } else if (form.paymentMethod === 'BANK_TRANSFER') {
    if (!/^\d{6,20}$/.test(form.accountNumber)) return 'Account number must be 6-20 digits';
    if (!IFSC_REGEX.test(form.ifscCode.toUpperCase())) return 'IFSC code format is invalid (e.g. HDFC0123456)';
    if (!form.accountHolderName.trim()) return 'Account holder name is required';
  } else if (form.paymentMethod === 'UPI') {
    if (!UPI_REGEX.test(form.senderAccount)) return 'Enter a valid UPI ID (e.g. name@bank)';
  }
  return null;
}

export default function CreatePaymentPage() {
  const navigate = useNavigate();
  const { user, updateUserBankData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receivingAccount, setReceivingAccount] = useState(null);
  const [receivingAccountError, setReceivingAccountError] = useState('');
  const [form, setForm] = useState({
    amount: '',
    currency: 'INR',
    senderAccount: '',
    purpose: '',
    paymentMethod: 'CARD',
    cardHolderName: '',
    cardExpiry: '',
    cardCvv: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    idempotencyKey: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await receivingAccountApi.get();
        if (!cancelled) setReceivingAccount(res.data.data);
      } catch (err) {
        if (!cancelled) {
          setReceivingAccountError(
            err.response?.data?.message || 'No receiving account has been configured yet.'
          );
        }
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

    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      const res = await paymentApi.create(payload);
      updateUserBankData({
        bankAccountNumber: res.data.data.userBankAccountNumber,
        bankBalance: res.data.data.userBankBalance,
      });
      toast.success('Payment submitted successfully');
      navigate(`/payments/${res.data.data.id}`);
    } catch (err) {
      const code = err.response?.data?.errorCode;
      const message = err.response?.data?.message || 'Failed to create payment';
      const fullMessage = code ? `${code}: ${message}` : message;
      setError(fullMessage);
      toast.error(fullMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Create Payment</h1>

      <div className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-soft border border-gray-100/70 mb-4 flex items-center gap-4">
        <div className="bg-indigo-50 text-indigo-600 rounded-full p-3">
          <Wallet size={20} />
        </div>
        <div>
        <p className="text-sm text-gray-500">Your Bank Account</p>
        <p className="text-sm font-semibold text-gray-800">{user?.bankAccountNumber || '-'}</p>
        <p className="text-sm text-gray-500 mt-2">Available Balance</p>
        <p className="text-lg font-bold text-green-700">INR {user?.bankBalance ?? '-'}</p>
        </div>
      </div>

      {receivingAccount ? (
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-4">
          <p className="text-sm text-indigo-700 font-medium">Money will be sent to</p>
          <p className="text-sm text-gray-800">A/C: {receivingAccount.accountNumber}</p>
          <p className="text-sm text-gray-800">UPI: {receivingAccount.upiId}</p>
        </div>
      ) : (
        <div className="bg-yellow-50 text-yellow-700 px-4 py-2 rounded mb-4 text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            {receivingAccountError} Please{' '}
            <Link to="/receiving-account" className="underline font-medium">
              configure a receiving account
            </Link>{' '}
            before sending a payment.
          </span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-2 rounded mb-4 text-sm border border-red-100">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-soft border border-gray-100/70 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              required
              min="0.01"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="100.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <p className="text-gray-700">INR</p>
            <input type="hidden" name="currency" value="INR" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
          <select
            name="paymentMethod"
            value={form.paymentMethod}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="UPI">UPI</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {form.paymentMethod === 'CARD' ? 'Card Number' : 'Sender Account'}
          </label>
          <input
            type="text"
            name="senderAccount"
            value={form.senderAccount}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={form.paymentMethod === 'UPI' ? 'sender@upi' : form.paymentMethod === 'CARD' ? 'Card number' : 'Sender account'}
          />
        </div>

        {form.paymentMethod === 'CARD' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Holder Name</label>
              <input
                type="text"
                name="cardHolderName"
                value={form.cardHolderName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Name on card"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry (MM/YY)</label>
              <input
                type="text"
                name="cardExpiry"
                value={form.cardExpiry}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="08/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
              <input
                type="password"
                name="cardCvv"
                value={form.cardCvv}
                onChange={handleChange}
                required
                maxLength={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="123"
              />
            </div>
          </div>
        )}

        {form.paymentMethod === 'BANK_TRANSFER' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">IFSC</label>
              <input
                type="text"
                name="ifscCode"
                value={form.ifscCode}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="HDFC0123456"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
              <input
                type="text"
                name="accountHolderName"
                value={form.accountHolderName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Account holder name"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Purpose / Comment</label>
          <textarea
            name="purpose"
            value={form.purpose}
            onChange={handleChange}
            required
            maxLength={300}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Write the purpose of this payment"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !receivingAccount}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 font-medium"
        >
          {loading ? <Spinner size={16} /> : <Send size={16} />}
          {loading ? 'Processing...' : 'Submit Payment'}
        </button>
      </form>
    </div>
  );
}
