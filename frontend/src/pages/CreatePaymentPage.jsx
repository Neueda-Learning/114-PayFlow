import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Wallet, AlertTriangle, Send, CreditCard, Landmark, Smartphone, ChevronDown, CheckCircle2, RotateCw } from 'lucide-react';
import { paymentApi, receivingAccountApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_REGEX = /^[\w.-]+@[\w.-]+$/;
const EXPIRY_REGEX = /^(0[1-9]|1[0-2])\/\d{2}$/;

function isCardExpired(expiryStr) {
  if (!EXPIRY_REGEX.test(expiryStr)) return true;
  const [mm, yy] = expiryStr.split('/').map(Number);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = Number(now.getFullYear().toString().slice(-2));

  if (yy < currentYear) return true;
  if (yy === currentYear && mm < currentMonth) return true;
  return false;
}

function validateForm(form, availableBalance) {
  const amt = parseFloat(form.amount);
  if (isNaN(amt) || amt <= 0) return 'Amount must be a positive number greater than 0';
  if (availableBalance !== undefined && availableBalance !== null && amt > Number(availableBalance)) {
    return `Insufficient balance in selected account (Available: INR ${availableBalance})`;
  }

  if (!form.purpose.trim() || form.purpose.trim().length < 3) {
    return 'Purpose / comment must be at least 3 characters long';
  }

  if (form.paymentMethod === 'CARD') {
    const rawCard = (form.senderAccount || '').replace(/\s+/g, '');
    if (!/^\d{13,19}$/.test(rawCard)) return 'Card number must be 13 to 19 numeric digits';
    if (!EXPIRY_REGEX.test(form.cardExpiry)) return 'Card expiry must be in MM/YY format (e.g. 12/28)';
    if (isCardExpired(form.cardExpiry)) return 'Card has expired! Please enter a valid future expiry date';
    if (!/^\d{3,4}$/.test(form.cardCvv)) return 'CVV must be 3 or 4 numeric digits';
    if (!form.cardHolderName.trim()) return 'Card holder name is required';
  } else if (form.paymentMethod === 'BANK_TRANSFER') {
    if (!form.accountNumber) return 'Destination account number is required';
    if (!form.ifscCode || !IFSC_REGEX.test(form.ifscCode.toUpperCase())) return 'IFSC code is invalid';
    if (!form.accountHolderName.trim()) return 'Receiver account holder name is required';
  } else if (form.paymentMethod === 'UPI') {
    if (!form.receiverAccount || !UPI_REGEX.test(form.receiverAccount.trim())) return 'Enter a valid Receiver UPI ID (e.g. receiver@upi)';
    if (!form.senderAccount || !UPI_REGEX.test(form.senderAccount.trim())) return 'Enter a valid Sender UPI ID (e.g. user@payflow)';
  }
  return null;
}

export default function CreatePaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, updateUserBankData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receivingAccounts, setReceivingAccounts] = useState([]);
  const [selectedReceiverId, setSelectedReceiverId] = useState('');
  const [receivingAccountError, setReceivingAccountError] = useState('');

  // Pre-configured sender accounts list for user selection
  const userUpiDefault = user?.email ? `${user.email.split('@')[0]}@payflow` : 'user@payflow';
  const senderAccountsList = [
    { id: 'PRIMARY', label: `Primary Bank A/C (${user?.bankAccountNumber || 'FP1'})`, accountNumber: user?.bankAccountNumber || 'FP1', balance: user?.bankBalance ?? 100000, holder: user?.name || 'Primary User' },
    { id: 'CORPORATE', label: 'HDFC Corporate Account (FP2002)', accountNumber: 'FP2002', balance: 250000, holder: 'PayFlow Corporate User' },
    { id: 'BUSINESS', label: 'Axis Business Account (FP3003)', accountNumber: 'FP3003', balance: 500000, holder: 'PayFlow Enterprise' },
  ];

  const [selectedSenderId, setSelectedSenderId] = useState('PRIMARY');
  const activeSender = senderAccountsList.find(s => s.id === selectedSenderId) || senderAccountsList[0];

  const [form, setForm] = useState({
    amount: searchParams.get('amount') || '',
    currency: 'INR',
    senderAccount: '', // Start empty for card/blank inputs
    receiverAccount: searchParams.get('receiverAccount') || '',
    purpose: searchParams.get('purpose') ? `Repeat: ${searchParams.get('purpose')}` : '',
    paymentMethod: searchParams.get('paymentMethod') || 'CARD',
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
        const res = await receivingAccountApi.getAll();
        if (!cancelled && res.data.data) {
          const list = Array.isArray(res.data.data) ? res.data.data : [res.data.data];
          setReceivingAccounts(list);
          if (list.length > 0) {
            const first = list[0];
            setSelectedReceiverId(first.id || '');
            applyReceiverSelection(first, form.paymentMethod);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setReceivingAccountError(
            err.response?.data?.message || 'No receiving accounts configured.'
          );
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const applyReceiverSelection = (rec, method) => {
    if (!rec) return;
    setForm(prev => ({
      ...prev,
      accountNumber: rec.accountNumber || '',
      ifscCode: rec.ifscCode || 'HDFC0123456',
      accountHolderName: rec.accountHolderName || 'PayFlow Treasury',
      receiverAccount: searchParams.get('receiverAccount') || (method === 'UPI' ? (rec.upiId || 'receiver@upi') : (rec.accountNumber || '')),
    }));
  };

  const handleReceiverSelectChange = (e) => {
    const id = e.target.value;
    setSelectedReceiverId(id);
    const rec = receivingAccounts.find(r => String(r.id) === String(id) || r.accountNumber === id);
    if (rec) {
      applyReceiverSelection(rec, form.paymentMethod);
    }
  };

  const handleSenderSelectChange = (e) => {
    const id = e.target.value;
    setSelectedSenderId(id);
    const sender = senderAccountsList.find(s => s.id === id) || senderAccountsList[0];
    if (form.paymentMethod === 'BANK_TRANSFER') {
      setForm(prev => ({ ...prev, senderAccount: sender.accountNumber }));
    }
  };

  const handleMethodSelect = (method) => {
    const updated = { ...form, paymentMethod: method };
    const currentReceiver = receivingAccounts.find(r => String(r.id) === String(selectedReceiverId)) || receivingAccounts[0];

    if (method === 'UPI') {
      updated.senderAccount = userUpiDefault;
      updated.receiverAccount = currentReceiver?.upiId || 'receiver@upi';
    } else if (method === 'CARD') {
      updated.senderAccount = '';
      updated.cardHolderName = '';
      updated.cardExpiry = '';
      updated.cardCvv = '';
      updated.receiverAccount = currentReceiver?.accountNumber || '';
    } else {
      updated.senderAccount = activeSender.accountNumber;
      updated.receiverAccount = currentReceiver?.accountNumber || '';
      if (currentReceiver) {
        updated.accountNumber = currentReceiver.accountNumber || '';
        updated.accountHolderName = currentReceiver.accountHolderName || '';
        updated.ifscCode = currentReceiver.ifscCode || 'HDFC0123456';
      }
    }
    setForm(updated);
  };

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'amount') {
      if (Number(value) < 0) value = '0';
    } else if (name === 'ifscCode') {
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    } else if (name === 'cardCvv') {
      value = value.replace(/\D/g, '');
    } else if (name === 'cardExpiry') {
      value = value.replace(/[^0-9/]/g, '');
    }
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateForm(form, activeSender.balance);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    setLoading(true);
    try {
      const payload = { 
        ...form, 
        amount: parseFloat(form.amount),
        ifscCode: form.ifscCode ? form.ifscCode.toUpperCase() : undefined,
        senderAccount: (form.senderAccount || activeSender.accountNumber).trim(),
        receiverAccount: form.receiverAccount.trim()
      };
      const res = await paymentApi.create(payload);
      updateUserBankData({
        bankAccountNumber: res.data.data.userBankAccountNumber,
        bankBalance: res.data.data.userBankBalance,
      });
      toast.success('Payment submitted successfully');
      navigate(`/payments/${res.data.data.id}`);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create payment';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Initiate Payment</h1>
          <p className="text-sm text-slate-500 font-medium">Select source and destination accounts to transfer funds</p>
        </div>

        <div className="flex items-center gap-3 bg-white border border-slate-200 px-3.5 py-2 rounded shadow-subtle text-sm">
          <span className="text-slate-600 font-medium">Active Source: <strong className="text-slate-900">{activeSender.accountNumber}</strong></span>
          <span className="text-slate-300">|</span>
          <span className="text-emerald-700 font-bold">Bal: INR {Number(activeSender.balance).toLocaleString()}</span>
        </div>
      </div>

      {searchParams.get('purpose') && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-2.5 rounded text-xs font-bold flex items-center gap-2">
          <RotateCw size={14} className="text-blue-600 animate-spin" />
          <span>Pre-filled for Repeat Payment (Replay Transaction)</span>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 text-rose-700 px-4 py-2.5 rounded text-sm border border-rose-200 font-bold">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-5 shadow-subtle space-y-4">
        {/* Method selector bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'CARD', label: 'Card Payment', icon: CreditCard },
            { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Landmark },
            { id: 'UPI', label: 'UPI Payment', icon: Smartphone },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleMethodSelect(id)}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded border text-sm font-bold transition-colors ${
                form.paymentMethod === id
                  ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-subtle'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* 1. SELECT SENDER ACCOUNT DROPDOWN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Select Sender Account (Source)</label>
            <div className="relative">
              <select
                value={selectedSenderId}
                onChange={handleSenderSelectChange}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 appearance-none cursor-pointer"
              >
                {senderAccountsList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} — Bal: INR {s.balance.toLocaleString()}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* 2. SELECT RECEIVER ACCOUNT DROPDOWN */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Select Receiver Account (Destination)</label>
            <div className="relative">
              <select
                value={selectedReceiverId}
                onChange={handleReceiverSelectChange}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 appearance-none cursor-pointer"
              >
                {receivingAccounts.length === 0 ? (
                  <option value="">No receiver accounts configured</option>
                ) : (
                  receivingAccounts.map((rec) => (
                    <option key={rec.id} value={rec.id}>
                      {rec.accountHolderName} ({form.paymentMethod === 'UPI' ? rec.upiId : rec.accountNumber})
                    </option>
                  ))
                )}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Amount (INR)</label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }}
              required
              min="0.01"
              max={activeSender.balance}
              step="0.01"
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded text-base font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              placeholder="100.00"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {form.paymentMethod === 'UPI' ? 'Selected Receiver UPI' : 'Destination Account Number'}
            </label>
            <input
              type="text"
              name="receiverAccount"
              value={form.receiverAccount}
              readOnly
              className="w-full px-3.5 py-2 bg-slate-100 border border-slate-300 rounded text-sm font-bold text-slate-900 font-mono cursor-not-allowed"
            />
          </div>
        </div>

        {/* Method Specific Details */}
        {form.paymentMethod === 'UPI' && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Sender UPI ID</label>
              <input
                type="text"
                name="senderAccount"
                value={form.senderAccount}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                placeholder="user@payflow"
              />
            </div>
          </div>
        )}

        {form.paymentMethod === 'CARD' && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Card Number (13-19 Digits)</label>
              <input
                type="text"
                name="senderAccount"
                value={form.senderAccount}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                placeholder="Enter 16-digit card number"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Card Holder Name</label>
                <input
                  type="text"
                  name="cardHolderName"
                  value={form.cardHolderName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:border-blue-600 font-semibold"
                  placeholder="Cardholder Name"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Expiry (MM/YY)</label>
                <input
                  type="text"
                  name="cardExpiry"
                  value={form.cardExpiry}
                  onChange={handleChange}
                  required
                  maxLength={5}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:border-blue-600 font-mono"
                  placeholder="MM/YY"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">CVV (3-4 Digits)</label>
                <input
                  type="password"
                  name="cardCvv"
                  value={form.cardCvv}
                  onChange={handleChange}
                  required
                  maxLength={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-sm text-slate-900 focus:border-blue-600 font-mono"
                  placeholder="CVV"
                />
              </div>
            </div>
          </div>
        )}

        {form.paymentMethod === 'BANK_TRANSFER' && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Receiver Account Number</label>
                <input
                  type="text"
                  name="accountNumber"
                  value={form.accountNumber}
                  readOnly
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded text-sm text-slate-800 font-mono font-bold cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Receiver IFSC Code</label>
                <input
                  type="text"
                  name="ifscCode"
                  value={form.ifscCode}
                  readOnly
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded text-sm text-slate-800 font-mono font-bold cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Receiver Name</label>
                <input
                  type="text"
                  name="accountHolderName"
                  value={form.accountHolderName}
                  readOnly
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded text-sm text-slate-800 font-bold cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        )}

        {/* Purpose */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Purpose / Description</label>
          <input
            type="text"
            name="purpose"
            value={form.purpose}
            onChange={handleChange}
            required
            maxLength={300}
            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            placeholder="Reason for payment (min 3 characters)"
          />
        </div>

        <button
          type="submit"
          disabled={loading || receivingAccounts.length === 0}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded font-bold text-sm shadow-subtle disabled:opacity-50 transition-colors"
        >
          {loading ? <Spinner size={18} /> : <Send size={18} />}
          {loading ? 'Processing Payment...' : 'Submit Payment'}
        </button>
      </form>
    </div>
  );
}
