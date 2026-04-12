import { useQuery } from '@tanstack/react-query';
import { getBoard } from '../api/pipeline';
import { getConversations } from '../api/conversations';
import { getAppointments } from '../api/appointments';
import Spinner from '../components/ui/Spinner';
import PageHeader from '../components/layout/PageHeader';

const StatCard = ({ label, value, color }) => (
  <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
    <p className="text-sm text-gray-400">{label}</p>
    <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
  </div>
);

export default function DashboardPage() {
  const { data: board } = useQuery({ queryKey: ['pipeline'], queryFn: getBoard });
  const { data: convData } = useQuery({
    queryKey: ['conversations', { mode: 'HUMAN' }],
    queryFn: () => getConversations({ mode: 'HUMAN', limit: 1 }),
  });
  const today = new Date().toISOString().split('T')[0];
  const { data: apptData } = useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: () => getAppointments({ from: today, to: today + 'T23:59:59', limit: 100 }),
  });

  if (!board) return <div className="flex justify-center py-20"><Spinner /></div>;

  const totalLeads = (board.board?.LEAD || []).length;
  const totalScheduled = (board.board?.SCHEDULED || []).length;
  const pendingHuman = convData?.meta?.total || 0;
  const todayAppts = apptData?.meta?.total || 0;

  return (
    <div>
      <PageHeader title="Dashboard" description="Visão geral da clínica hoje" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Leads ativos" value={totalLeads} color="text-gray-900" />
        <StatCard label="Agendados" value={totalScheduled} color="text-indigo-600" />
        <StatCard label="Consultas hoje" value={todayAppts} color="text-green-600" />
        <StatCard label="Aguardando humano" value={pendingHuman} color="text-orange-600" />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 className="text-base font-semibold text-white mb-4">Distribuição do Pipeline</h2>
        <div className="flex gap-3 flex-wrap">
          {board.stages?.map((stage) => (
            <div key={stage} className="flex flex-col items-center">
              <span className="text-2xl font-bold text-white">{(board.board[stage] || []).length}</span>
              <span className="text-xs text-gray-500 mt-1">{stage}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
