import { useQuery } from '@tanstack/react-query';
import { getWhatsAppStatus } from '../api/whatsapp';
import PageHeader from '../components/layout/PageHeader';
import Spinner from '../components/ui/Spinner';

const STATUS_CONFIG = {
  connected: {
    color: 'bg-green-500/10 border-green-700',
    dot: 'bg-green-500',
    label: 'Conectado',
    description: 'WhatsApp está online e recebendo mensagens.',
  },
  qr_pending: {
    color: 'bg-yellow-500/10 border-yellow-700',
    dot: 'bg-yellow-400 animate-pulse',
    label: 'Aguardando QR Code',
    description: 'Escaneie o QR Code abaixo com o WhatsApp do número da clínica.',
  },
  connecting: {
    color: 'bg-blue-500/10 border-blue-700',
    dot: 'bg-blue-400 animate-pulse',
    label: 'Conectando...',
    description: 'Aguarde enquanto o sistema estabelece conexão.',
  },
  disconnected: {
    color: 'bg-red-500/10 border-red-700',
    dot: 'bg-red-500',
    label: 'Desconectado',
    description: 'WhatsApp offline. Reinicie o servidor para reconectar.',
  },
};

export default function WhatsAppPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: getWhatsAppStatus,
    refetchInterval: 3000, // polling a cada 3s
  });

  const config = STATUS_CONFIG[data?.status] || STATUS_CONFIG.disconnected;

  return (
    <div>
      <PageHeader
        title="WhatsApp"
        description="Conexão da secretária virtual"
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <div className="max-w-lg space-y-6">
          {/* Card de status */}
          <div className={`rounded-xl border-2 p-5 ${config.color}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className={`w-3 h-3 rounded-full ${config.dot}`} />
              <span className="font-semibold text-gray-100">{config.label}</span>
            </div>
            <p className="text-sm text-gray-400">{config.description}</p>
          </div>

          {/* QR Code */}
          {data?.status === 'qr_pending' && data?.qr && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 flex flex-col items-center gap-4">
              <p className="text-sm font-medium text-gray-700">
                Abra o WhatsApp → Dispositivos Conectados → Conectar dispositivo
              </p>
              <img
                src={data.qr}
                alt="QR Code WhatsApp"
                className="w-56 h-56 rounded-lg"
              />
              <p className="text-xs text-gray-400 text-center">
                QR Code atualiza automaticamente. Se expirar, aguarde um novo aparecer.
              </p>
            </div>
          )}

          {/* Conectado */}
          {data?.status === 'connected' && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h3 className="font-medium text-gray-100 mb-3">Sistema ativo</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Recebendo mensagens dos pacientes
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> IA respondendo automaticamente
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Agendamentos, cancelamentos e remarcações
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> Lembretes automáticos ativos
                </li>
              </ul>
            </div>
          )}

          {/* Instrução inicial */}
          {data?.status === 'disconnected' && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <h3 className="font-medium text-gray-100 mb-2">Como conectar</h3>
              <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                <li>Configure <code className="bg-gray-800 px-1 rounded text-gray-300">WHATSAPP_PROVIDER=baileys</code> no .env</li>
                <li>Reinicie o servidor backend</li>
                <li>Volte aqui — o QR Code aparecerá automaticamente</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
