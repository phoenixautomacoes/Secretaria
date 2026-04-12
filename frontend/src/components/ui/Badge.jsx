const colors = {
  LEAD: 'bg-gray-700/50 text-gray-300',
  QUALIFIED: 'bg-blue-500/20 text-blue-300',
  SCHEDULED: 'bg-indigo-500/20 text-indigo-300',
  ATTENDED: 'bg-green-500/20 text-green-300',
  NO_SHOW: 'bg-red-500/20 text-red-300',
  POST_CONSULT: 'bg-purple-500/20 text-purple-300',
  AI: 'bg-sky-500/20 text-sky-300',
  HUMAN: 'bg-orange-500/20 text-orange-300',
  SUCCESS: 'bg-green-500/20 text-green-300',
  FAILED: 'bg-red-500/20 text-red-300',
  RUNNING: 'bg-yellow-500/20 text-yellow-300',
  COMPLETED: 'bg-green-500/20 text-green-300',
  PENDING: 'bg-gray-700/50 text-gray-300',
  CONFIRMED: 'bg-indigo-500/20 text-indigo-300',
  CANCELLED: 'bg-gray-700/50 text-gray-500',
  default: 'bg-gray-700/50 text-gray-300',
};

const labels = {
  LEAD: 'Lead',
  QUALIFIED: 'Qualificado',
  SCHEDULED: 'Agendado',
  ATTENDED: 'Compareceu',
  NO_SHOW: 'No-show',
  POST_CONSULT: 'Pós-consulta',
  AI: 'IA',
  HUMAN: 'Humano',
};

export default function Badge({ value, label, className = '' }) {
  const color = colors[value] || colors.default;
  const text = label || labels[value] || value;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color} ${className}`}>
      {text}
    </span>
  );
}
