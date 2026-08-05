import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'No records found', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-6">
      <div className="bg-slate-100 text-slate-400 rounded-full p-3 mb-2">
        <Icon size={24} />
      </div>
      <p className="text-slate-700 font-semibold text-sm">{title}</p>
      {message && <p className="text-xs text-slate-500 mt-0.5 max-w-xs">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
