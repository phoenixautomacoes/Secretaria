import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getConversations, getMessages, sendMessage, assume, returnToAI, deleteConversation } from '../api/conversations';
import PageHeader from '../components/layout/PageHeader';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { getSocket } from '../hooks/useSocket';

export default function ConversationsPage() {
  const [selected, setSelected] = useState(null);
  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);
  const qc = useQueryClient();

  const { data: convData, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => getConversations({ limit: 50 }),
    refetchInterval: 10000,
  });

  const { data: msgData } = useQuery({
    queryKey: ['messages', selected?.id],
    queryFn: () => getMessages(selected.id, { limit: 100 }),
    enabled: !!selected,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: () => sendMessage(selected.id, { content: text }),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['messages', selected.id] });
    },
  });

  const assumeMutation = useMutation({
    mutationFn: () => assume(selected.id),
    onSuccess: (data) => {
      setSelected(data);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteConversation(id),
    onSuccess: () => {
      setSelected(null);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const returnMutation = useMutation({
    mutationFn: () => returnToAI(selected.id),
    onSuccess: (data) => {
      setSelected(data);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgData]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !selected) return;
    socket.emit('join_conversation', selected.id);
    const handler = (msg) => qc.setQueryData(['messages', selected.id], (old) => old ? { ...old, data: [...(old.data || []), msg] } : old);
    socket.on('new_message', handler);
    return () => {
      socket.emit('leave_conversation', selected.id);
      socket.off('new_message', handler);
    };
  }, [selected, qc]);

  return (
    <div>
      <PageHeader title="Conversas" description="Atendimento via WhatsApp" />

      <div className="flex gap-4 h-[calc(100vh-180px)]">
        {/* Lista */}
        <div className="w-72 bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wide">
            {convData?.meta?.total || 0} conversas
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading && <div className="flex justify-center py-8"><Spinner size="sm" /></div>}
            {convData?.data?.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center border-b border-gray-800 transition-colors ${selected?.id === conv.id ? 'bg-primary-600/20' : 'hover:bg-gray-800'}`}
              >
                <button
                  onClick={() => setSelected(conv)}
                  className="flex-1 text-left px-4 py-3 min-w-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-100 truncate">{conv.patient?.name}</span>
                    <Badge value={conv.mode} />
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {conv.messages?.[0]?.content || 'Sem mensagens'}
                  </p>
                </button>
                <button
                  onClick={() => confirm('Excluir conversa e mensagens?') && deleteMutation.mutate(conv.id)}
                  className="opacity-0 group-hover:opacity-100 px-2 py-1 mr-2 text-red-400 hover:text-red-300 transition-opacity"
                  title="Excluir conversa"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex items-center justify-center flex-1 text-gray-500 text-sm">
              Selecione uma conversa
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-100">{selected.patient?.name || 'Paciente'}</p>
                  <Badge value={selected.mode} />
                </div>
                <div className="flex gap-2">
                  {selected.mode === 'AI' ? (
                    <Button size="sm" variant="secondary" onClick={() => assumeMutation.mutate()} loading={assumeMutation.isPending}>
                      Assumir
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => returnMutation.mutate()} loading={returnMutation.isPending}>
                      Devolver à IA
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgData?.data?.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.direction === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-xl text-sm ${msg.direction === 'OUT' ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-100'}`}>
                      {msg.content}
                      <p className={`text-xs mt-1 ${msg.direction === 'OUT' ? 'text-primary-200' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="px-4 py-3 border-t border-gray-800 flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-500"
                  placeholder="Digite uma mensagem..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && text && sendMutation.mutate()}
                />
                <Button onClick={() => sendMutation.mutate()} disabled={!text} loading={sendMutation.isPending}>
                  Enviar
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
