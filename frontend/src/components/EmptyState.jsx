import { Inbox } from 'lucide-react';

export default function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-12">
      <div className="bg-gray-50 text-gray-300 rounded-full p-4 mb-3">
        <Icon size={32} />
      </div>
      <p className="text-gray-600 font-medium">{title}</p>
      {message && <p className="text-sm text-gray-400 mt-1 max-w-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
