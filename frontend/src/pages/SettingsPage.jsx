import { useQuery } from '@tanstack/react-query';
import { getAutomations, getExecutions } from '../api/automations';
import PageHeader from '../components/layout/PageHeader';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';

export default function SettingsPage() {
  const { data: autoData, isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: () => getAutomations({ limit: 50 }),
  });

  const { data: execData } = useQuery({
    queryKey: ['executions'],
    queryFn: () => getExecutions({ limit: 20 }),
  });

  return (
    <div>
      <PageHeader title="Configurações" description="Automações e execuções" />

      <div className="space-y-8">
        {/* Automações */}
        <section>
          <h2 className="text-base font-semibold text-white mb-3">Automações ativas</h2>
          {isLoading ? (
            <Spinner />
          ) : (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-800">
                    <th className="px-4 py-3 text-left font-medium text-gray-400">Nome</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-400">Gatilho</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-400">Delay</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {autoData?.data?.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 font-medium text-gray-100">{a.name}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-400">{a.trigger}</td>
                      <td className="px-4 py-3 text-gray-400">{a.delayMinutes ? `${a.delayMinutes}min` : 'Imediato'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${a.isActive ? 'bg-green-500/20 text-green-300' : 'bg-gray-700/50 text-gray-400'}`}>
                          {a.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Execuções recentes */}
        <section>
          <h2 className="text-base font-semibold text-white mb-3">Execuções recentes</h2>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-800">
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Regra</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Paciente</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-400">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {execData?.data?.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 text-gray-900">{e.rule?.name}</td>
                    <td className="px-4 py-3 text-gray-400">{e.patient?.name}</td>
                    <td className="px-4 py-3"><Badge value={e.status} /></td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(e.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
