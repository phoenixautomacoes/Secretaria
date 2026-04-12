import KanbanCard from './KanbanCard';

const stageLabels = {
  LEAD: 'Lead',
  QUALIFIED: 'Qualificado',
  SCHEDULED: 'Agendado',
  NO_SHOW: 'No-show',
  ATTENDED: 'Compareceu',
  POST_CONSULT: 'Pós-consulta',
};

const stageColors = {
  LEAD: 'bg-gray-700/50 text-gray-300',
  QUALIFIED: 'bg-blue-500/20 text-blue-300',
  SCHEDULED: 'bg-indigo-500/20 text-indigo-300',
  NO_SHOW: 'bg-red-500/20 text-red-300',
  ATTENDED: 'bg-green-500/20 text-green-300',
  POST_CONSULT: 'bg-purple-500/20 text-purple-300',
};

export default function KanbanColumn({ stage, patients, onCardClick }) {
  return (
    <div className="flex flex-col bg-gray-900 rounded-xl p-3 min-w-[220px] w-[220px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-200">{stageLabels[stage]}</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stageColors[stage]}`}>
          {patients.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
        {patients.map((p) => (
          <KanbanCard key={p.id} patient={p} onClick={onCardClick} />
        ))}
      </div>
    </div>
  );
}
