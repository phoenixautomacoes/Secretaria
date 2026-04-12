import Badge from '../ui/Badge';

export default function KanbanCard({ patient, onClick }) {
  const nextAppt = patient.appointments?.[0];

  return (
    <div
      onClick={() => onClick?.(patient)}
      className="bg-gray-800 rounded-lg border border-gray-700 p-3 cursor-pointer hover:bg-gray-750 hover:border-gray-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-100 truncate">{patient.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{patient.phone}</p>
        </div>
        {patient.conversations?.[0] && (
          <Badge value={patient.conversations[0].mode} />
        )}
      </div>
      {nextAppt && (
        <p className="text-xs text-indigo-600 mt-2">
          {new Date(nextAppt.startsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  );
}
