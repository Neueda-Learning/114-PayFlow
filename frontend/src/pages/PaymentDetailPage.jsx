import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Copy, RotateCcw, RefreshCw, AlertTriangle, CheckCircle2, Printer, RotateCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { paymentApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';

export default function PaymentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { updateUserBankData } = useAuth();
  const [payment, setPayment] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
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
      if (paymentRes.data.data.userBankBalance !== undefined) {
        updateUserBankData({ bankBalance: paymentRes.data.data.userBankBalance });
      }
    } catch (err) {
      const code = err.response?.data?.errorCode;
      const message = err.response?.data?.message || 'Failed to load payment';
      setError(code ? `${code}: ${message}` : message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleRollback = async () => {
    setActionLoading(true);
    try {
      const res = await paymentApi.rollback(id);
      setPayment(res.data.data);
      updateUserBankData({ bankBalance: res.data.data.userBankBalance });
      toast.success('Funds successfully rolled back to your account balance!');
      loadPayment();
    } catch (err) {
      const message = err.response?.data?.message || 'Rollback failed';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    setActionLoading(true);
    try {
      const res = await paymentApi.retry(id);
      setPayment(res.data.data);
      updateUserBankData({ bankBalance: res.data.data.userBankBalance });
      toast.success('Payment retry initiated');
      loadPayment();
    } catch (err) {
      const message = err.response?.data?.message || 'Retry failed';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRepeatPayment = () => {
    if (!payment) return;
    const params = new URLSearchParams({
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      receiverAccount: payment.receiverAccount,
      purpose: payment.purpose || '',
    });
    navigate(`/payments/create?${params.toString()}`);
  };

  const handlePrintReceipt = () => {
    if (!payment) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt #${payment.id} - PayFlow</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; max-width: 650px; margin: auto; }
            .header { border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 22px; font-weight: 800; color: #0f172a; }
            .badge { background: #e0f2fe; color: #0369a1; font-weight: bold; padding: 4px 10px; border-radius: 4px; font-size: 12px; text-transform: uppercase; }
            .section { margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px; }
            .label { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; }
            .val { font-weight: bold; margin-top: 2px; }
            .footer { font-size: 11px; text-align: center; color: #94a3b8; margin-top: 30px; border-t: 1px solid #e2e8f0; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">PayFlow Official Statement</div>
              <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">Transaction Ref: #${payment.id}</p>
            </div>
            <span class="badge">${payment.status}</span>
          </div>

          <div class="section">
            <div class="grid">
              <div>
                <div class="label">Amount Transferred</div>
                <div class="val" style="font-size: 20px; color: #2563eb;">${payment.amount} ${payment.currency}</div>
              </div>
              <div>
                <div class="label">Payment Method</div>
                <div class="val">${payment.paymentMethod}</div>
              </div>
              <div>
                <div class="label">Sender Account</div>
                <div class="val">${payment.senderAccount}</div>
              </div>
              <div>
                <div class="label">Receiver Account</div>
                <div class="val">${payment.receiverAccount}</div>
              </div>
              <div>
                <div class="label">Purpose</div>
                <div class="val">${payment.purpose || '-'}</div>
              </div>
              <div>
                <div class="label">Timestamp</div>
                <div class="val">${new Date(payment.createdAt).toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Generated by PayFlow Enterprise Payment Engine • Strictly Confidential</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const isRollbackInitiatedEvent = (h) => /rollback initiated/i.test(h.reason || '');
  const isRefundEvent = (h) => /refunded/i.test(h.reason || '');
  const isRollbackCompletedEvent = (h) => /rollback completed/i.test(h.reason || '');
  const isDebitEvent = (h) => /debit/i.test(h.reason || '');

  const paymentComment = payment?.purpose || payment?.comment || payment?.description || '-';

  if (loading) return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-500">
      <Spinner size={24} />
      <p className="text-sm font-medium">Loading payment record...</p>
    </div>
  );

  if (!payment) return <div className="p-6 text-center text-rose-600 text-base font-bold">{error || 'Payment not found'}</div>;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/payments" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline">
          <ArrowLeft size={16} />
          Back to Payments
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRepeatPayment}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold shadow-subtle transition-all"
            title="Replay transaction with same parameters"
          >
            <RotateCw size={14} />
            <span>Repeat Payment</span>
          </button>
          <button
            onClick={handlePrintReceipt}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3 py-1.5 rounded text-xs font-bold transition-all"
          >
            <Printer size={14} />
            <span>Print Official Receipt</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold text-slate-900">Payment Record #{payment.id}</h1>
          <button
            onClick={() => copyToClipboard(payment.id, 'Payment ID')}
            className="text-slate-400 hover:text-slate-700"
            title="Copy ID"
          >
            <Copy size={16} />
          </button>
          <StatusBadge status={payment.status} />
        </div>

        {/* Action Buttons for FAILED status */}
        {payment.status === 'FAILED' && (
          <div className="flex items-center gap-2">
            {!payment.refunded ? (
              <button
                onClick={handleRollback}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded text-xs font-bold shadow-subtle transition-all disabled:opacity-50"
              >
                {actionLoading ? <Spinner size={14} /> : <RotateCcw size={14} />}
                <span>Rollback Funds Manually</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded text-xs font-bold">
                <CheckCircle2 size={14} />
                <span>Funds Rolled Back</span>
              </span>
            )}

            {payment.retryCount < 3 && (
              <button
                onClick={handleRetry}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded text-xs font-bold shadow-subtle transition-all disabled:opacity-50"
              >
                {actionLoading ? <Spinner size={14} /> : <RefreshCw size={14} />}
                <span>Retry ({3 - payment.retryCount} left)</span>
              </button>
            )}
          </div>
        )}
      </div>

      {error && <div className="bg-rose-50 text-rose-700 px-4 py-2.5 rounded text-sm border border-rose-200 font-bold">{error}</div>}

      {/* Special Banner for Failed Payment with Debited Funds */}
      {payment.status === 'FAILED' && !payment.refunded && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded p-4 text-sm font-medium flex items-start gap-3 shadow-subtle">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-slate-900">Funds Debited During Processing Failure</p>
            <p className="text-xs text-slate-700">
              The amount of <strong>INR {payment.amount}</strong> was debited from your bank account during processing, but downstream execution failed.
              Click <strong>"Rollback Funds Manually"</strong> above to instantly credit the funds back to your balance.
            </p>
          </div>
        </div>
      )}

      {/* Special Banner for Refunded Payment */}
      {payment.refunded && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded p-4 text-sm font-medium flex items-start gap-3 shadow-subtle">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-emerald-900">Funds Successfully Rolled Back</p>
            <p className="text-xs text-emerald-800">
              The debited amount of <strong>INR {payment.amount}</strong> has been credited back to your bank account balance. Your account balance is now <strong>INR {payment.userBankBalance}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Details Box */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-subtle space-y-4">
        <div className="bg-slate-50 border border-slate-200 p-3 rounded">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Purpose / Note</p>
          <p className="text-sm font-semibold text-slate-900">{paymentComment}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">{payment.amount} {payment.currency}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Method</p>
            <p className="font-bold text-slate-800 mt-0.5">{payment.paymentMethod}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sender</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-semibold text-slate-800">{payment.senderAccount}</span>
              <button onClick={() => copyToClipboard(payment.senderAccount, 'Sender Account')} className="text-slate-400 hover:text-slate-700"><Copy size={13} /></button>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Receiver</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-semibold text-slate-800">{payment.receiverAccount}</span>
              <button onClick={() => copyToClipboard(payment.receiverAccount, 'Receiver Account')} className="text-slate-400 hover:text-slate-700"><Copy size={13} /></button>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">User Bank A/C</p>
            <p className="font-semibold text-slate-800 mt-0.5">{payment.userBankAccountNumber || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">User Balance</p>
            <p className="font-extrabold text-emerald-700 mt-0.5">INR {payment.userBankBalance ?? '-'}</p>
          </div>

          {payment.paymentMethod === 'CARD' && (
            <>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Card Holder</p>
                <p className="font-semibold text-slate-800 mt-0.5">{payment.cardHolderName || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Card Expiry</p>
                <p className="font-semibold text-slate-800 mt-0.5">{payment.cardExpiry || '-'}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-subtle">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock size={16} className="text-blue-600" />
          Audit Log History
        </h2>

        {history.length === 0 ? (
          <p className="text-xs text-slate-500 font-medium">No audit log recorded.</p>
        ) : (
          <div className="space-y-2.5">
            {history.map((h) => (
              <div key={h.id} className={`flex items-center justify-between p-2.5 rounded border text-xs font-medium ${
                isRefundEvent(h) || isRollbackCompletedEvent(h) ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold' :
                isRollbackInitiatedEvent(h) || isDebitEvent(h) ? 'bg-amber-50 border-amber-200 text-amber-900 font-bold' :
                'bg-slate-50 border-slate-200 text-slate-900'
              }`}>
                <div>
                  <span className="font-bold">
                    {isRollbackInitiatedEvent(h) ? '⏳ Rollback Initiated' :
                      isRefundEvent(h) ? '↩️ Funds Refunded' :
                      isRollbackCompletedEvent(h) ? '✅ Rollback Completed' :
                      isDebitEvent(h) ? '💸 Funds Debited' :
                      h.oldStatus ? `${h.oldStatus} → ${h.newStatus}` : h.newStatus}
                  </span>
                  <span className="ml-2 font-semibold text-slate-700">({h.reason})</span>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {h.triggerType} by {h.triggeredBy} • {new Date(h.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
