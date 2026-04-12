import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAppointments, createAppointment, updateAppointment } from '../api/appointments';
import { getPatients } from '../api/patients';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

const statusLabel = { SCHEDULED: 'Agendado', ATTENDED: 'Compareceu', NO_SHOW: 'No-show', CANCELLED: 'Cancelado' };
const statusColor = { SCHEDULED: 'text-indigo-600', ATTENDED: 'text-green-600', NO_SHOW: 'text-red-600', CANCELLED: 'text-gray-400' };

export default function AppointmentsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ patientId: '', startsAt: '', duration: 60, title: '', notes: '' });
  const qc = useQueryClient();

  const today = new Date().toISOString().split('T')[0];
  const { data, isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => getAppointments({ limit: 50 }),
  });

  const { data: patientsData } = useQuery({
    queryKey: ['patients', ''],
    queryFn: () => getPatients({ limit: 100 }),
    enabled: modalOpen,
  });

  const createMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      setModalOpen(false);
      setForm({ patientId: '', startsAt: '', duration: 60, title: '', notes: '' });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateAppointment(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  });

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Consultas agendadas"
        action={<Button onClick={() => setModalOpen(true)}>Agendar Consulta</Button>}
      />

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : data?.data?.length === 0 ? (
        <EmptyState title="Nenhuma consulta" description="Agende a primeira consulta." />
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800">
                <th className="px-4 py-3 text-left font-medium text-gray-400">Paciente</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Data/Hora</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Duração</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data?.data?.map((a) => (
                <tr key={a.id} className="hover:bg-gray-800">
                  <td className="px-4 py-3 font-medium text-gray-100">{a.patient?.name}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(a.startsAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{a.duration}min</td>
                  <td className={`px-4 py-3 font-medium ${statusColor[a.status]}`}>{statusLabel[a.status]}</td>
                  <td className="px-4 py-3">
                    {a.status === 'SCHEDULED' && (
                      <div className="flex gap-2">
                        <button onClick={() => statusMutation.mutate({ id: a.id, status: 'ATTENDED' })} className="text-xs text-green-600 hover:underline">Compareceu</button>
                        <button onClick={() => statusMutation.mutate({ id: a.id, status: 'NO_SHOW' })} className="text-xs text-red-500 hover:underline">No-show</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Agendar Consulta">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, duration: Number(form.duration) }); }} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300">Paciente *</label>
            <select
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 text-gray-100"
              value={form.patientId}
              onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              required
            >
              <option value="">Selecione...</option>
              {patientsData?.data?.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {p.phone}</option>
              ))}
            </select>
          </div>
          <Input label="Data e Hora *" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} required />
          <Input label="Duração (min)" type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} min="15" max="240" />
          <Input label="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Consulta inicial, retorno..." />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={createMutation.isPending}>Agendar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
