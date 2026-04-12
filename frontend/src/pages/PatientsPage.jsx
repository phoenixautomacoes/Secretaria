import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPatients, createPatient, deletePatient } from '../api/patients';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['patients', search],
    queryFn: () => getPatients({ search, limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      setModalOpen(false);
      setForm({ name: '', phone: '', email: '', notes: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients'] }),
  });

  return (
    <div>
      <PageHeader
        title="Pacientes"
        description={`${data?.meta?.total || 0} pacientes cadastrados`}
        action={<Button onClick={() => setModalOpen(true)}>Novo Paciente</Button>}
      />

      <div className="mb-4">
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : data?.data?.length === 0 ? (
        <EmptyState title="Nenhum paciente encontrado" />
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800">
                <th className="px-4 py-3 text-left font-medium text-gray-400">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Telefone</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Etapa</th>
                <th className="px-4 py-3 text-left font-medium text-gray-400">Cadastrado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data?.data?.map((p) => (
                <tr key={p.id} className="hover:bg-gray-800">
                  <td className="px-4 py-3 font-medium text-gray-100">{p.name}</td>
                  <td className="px-4 py-3 text-gray-400">{p.phone}</td>
                  <td className="px-4 py-3"><Badge value={p.pipelineStage} /></td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => confirm('Remover paciente?') && deleteMutation.mutate(p.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Paciente">
        <form
          onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }}
          className="space-y-4"
        >
          <Input label="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Telefone * (somente números, com DDD)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="5551999999999" required />
          <Input label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div>
            <label className="text-sm font-medium text-gray-300">Anotações</label>
            <textarea
              className="mt-1 block w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" loading={createMutation.isPending}>Salvar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
