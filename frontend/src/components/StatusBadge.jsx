const COLORS = {
  CREATED: 'bg-gray-100 text-gray-700',
  VALIDATED: 'bg-blue-100 text-blue-700',
  SENT: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}
