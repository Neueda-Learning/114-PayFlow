import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { paymentApi } from '../api/endpoints';

export default function PaymentDetailPage() {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPayment();
  }, [id]);

  const loadPayment = async () => {
    try {
      const [paymentRes, historyRes] = await Promise.all([
        paymentApi.getById(id),
        paymentApi.getHistory(id),
      ]);
      setPayment(paymentRes.data.data);
      setHistory(historyRes.data.data || []);
    } catch (err) {
      const code = err.response?.data?.errorCode;
      const message = err.response?.data?.message || 'Failed to load payment';
      setError(code ? `${code}: ${message}` : message);
    } finally {
      setLoading(false);
    }
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

  const getLatestStatusTimestamp = (status) => {
    const entries = history.filter((h) => h.newStatus === status);
    if (entries.length === 0) return null;
    return entries[entries.length - 1].timestamp;
  };

  // Debit/refund entries are logged as same-status history rows (no state
  // transition), so they can be told apart from status changes and styled
  // distinctly for the customer.
  const isRefundEvent = (h) => h.oldStatus === h.newStatus && /refund/i.test(h.reason || '');
  const isDebitEvent = (h) => h.oldStatus === h.newStatus && /debit/i.test(h.reason || '');
  const rollbackEntry = history.find(isRefundEvent);

  const lifecycleEvents = [
    { label: 'Created At', value: getLatestStatusTimestamp('CREATED') || payment?.createdAt },
    { label: 'Validated At', value: getLatestStatusTimestamp('VALIDATED') },
    { label: 'Sent At', value: getLatestStatusTimestamp('SENT') },
    { label: 'Completed At', value: getLatestStatusTimestamp('COMPLETED') },
    { label: 'Failed At', value: getLatestStatusTimestamp('FAILED') },
  ];

  const paymentComment = payment?.purpose || payment?.comment || payment?.description || '-';

  if (loading) return <div className="text-center py-8 text-gray-400">Loading...</div>;
  if (!payment) return <div className="text-center py-8 text-red-500">{error || 'Payment not found'}</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/payments" className="text-indigo-600 hover:underline text-sm mb-4 inline-block">
        ← Back to Payments
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Payment #{payment.id}</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-2 rounded mb-4 text-sm">{error}</div>
      )}

      {/* Rollback Banner — shown when a failed payment's funds were refunded */}
      {rollbackEntry && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 mb-6 flex items-start gap-3">
          <span className="text-xl leading-none">↩️</span>
          <div>
            <p className="font-semibold">Rollback Completed</p>
            <p className="text-sm">
              This payment failed during processing, so {payment.currency} {payment.amount} was
              automatically reversed and credited back to your account. No money was lost.
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              Refunded at {new Date(rollbackEntry.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Payment Details */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="mb-4 rounded-md border border-indigo-100 bg-indigo-50 p-3">
          <p className="text-xs text-indigo-500 uppercase">Purpose / Comment</p>
          <p className="text-sm text-indigo-900 font-medium">{paymentComment}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase">Amount</p>
            <p className="text-lg font-semibold">{payment.amount} {payment.currency}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase">Status</p>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor(payment.status)}`}>
              {payment.status}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase">Method</p>
            <p className="font-medium">{payment.paymentMethod}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase">Sender</p>
            <p className="text-sm text-gray-700">{payment.senderAccount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase">Receiver</p>
            <p className="text-sm text-gray-700">{payment.receiverAccount}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase">User Bank Account</p>
            <p className="text-sm text-gray-700">{payment.userBankAccountNumber || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase">Remaining Balance</p>
            <p className="text-sm font-semibold text-green-700">INR {payment.userBankBalance ?? '-'}</p>
          </div>

          {payment.paymentMethod === 'CARD' && (
            <>
              <div>
                <p className="text-xs text-gray-400 uppercase">Card Holder</p>
                <p className="text-sm text-gray-700">{payment.cardHolderName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Card Expiry</p>
                <p className="text-sm text-gray-700">{payment.cardExpiry || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Card Number</p>
                <p className="text-sm text-gray-700">{payment.senderAccount || '-'}</p>
              </div>
            </>
          )}

          {payment.paymentMethod === 'BANK_TRANSFER' && (
            <>
              <div>
                <p className="text-xs text-gray-400 uppercase">Account Number</p>
                <p className="text-sm text-gray-700">{payment.accountNumber || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase">IFSC</p>
                <p className="text-sm text-gray-700">{payment.ifscCode || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Account Holder</p>
                <p className="text-sm text-gray-700">{payment.accountHolderName || '-'}</p>
              </div>
            </>
          )}

          {payment.failureCode && (
            <>
              <div>
                <p className="text-xs text-gray-400 uppercase">Failure Code</p>
                <p className="text-sm text-red-600 font-medium">{payment.failureCode}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400 uppercase">Failure Message</p>
                <p className="text-sm text-red-600">{payment.failureMessage}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Lifecycle Timestamps */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">Lifecycle Timestamps</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lifecycleEvents.map((event) => (
            <div key={event.label} className="rounded-md border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs text-gray-400 uppercase">{event.label}</p>
              <p className="text-sm font-medium text-gray-700">
                {event.value ? new Date(event.value).toLocaleString() : 'Not reached'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Audit History Timeline */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-700 mb-4">Payment History</h2>
        {history.length === 0 ? (
          <p className="text-gray-400">No history available</p>
        ) : (
          <div className="space-y-4">
            {history.map((h, idx) => (
              <div key={h.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${
                    isRefundEvent(h) ? 'bg-emerald-500' :
                    isDebitEvent(h) ? 'bg-amber-500' :
                    h.newStatus === 'COMPLETED' ? 'bg-green-500' :
                    h.newStatus === 'FAILED' ? 'bg-red-500' :
                    'bg-indigo-500'
                  }`} />
                  {idx < history.length - 1 && <div className="w-px h-8 bg-gray-200" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {isRefundEvent(h) ? '↩️ Rollback / Refund' :
                      isDebitEvent(h) ? '💸 Funds Reserved' :
                      h.oldStatus ? `${h.oldStatus} → ${h.newStatus}` : h.newStatus}
                  </p>
                  <p className="text-xs text-gray-400">{h.reason}</p>
                  <p className="text-xs text-gray-400">
                    Trigger: {h.triggerType} by {h.triggeredBy}
                  </p>
                  <p className="text-xs text-gray-300">
                    {new Date(h.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
