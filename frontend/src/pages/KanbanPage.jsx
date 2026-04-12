import { useState } from 'react';
import PageHeader from '../components/layout/PageHeader';
import KanbanBoard from '../components/kanban/KanbanBoard';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { moveStage } from '../api/pipeline';

const STAGES = ['LEAD', 'QUALIFIED', 'SCHEDULED', 'NO_SHOW', 'ATTENDED', 'POST_CONSULT'];

export default function KanbanPage() {
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }) => moveStage(id, stage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pipeline'] });
      setSelected(null);
    },
  });

  return (
    <div>
      <PageHeader title="Pipeline" description="Acompanhe o fluxo de pacientes" />
      <KanbanBoard onCardClick={setSelected} />

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.name}>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Telefone</p>
              <p className="font-medium">{selected.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Etapa atual</p>
              <Badge value={selected.pipelineStage} />
            </div>
            {selected.notes && (
              <div>
                <p className="text-sm text-gray-400">Anotações</p>
                <p className="text-sm text-gray-300 mt-1">{selected.notes}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-300 mb-2">Mover para:</p>
              <div className="flex flex-wrap gap-2">
                {STAGES.filter((s) => s !== selected.pipelineStage).map((stage) => (
                  <button
                    key={stage}
                    onClick={() => moveMutation.mutate({ id: selected.id, stage })}
                    disabled={moveMutation.isPending}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 font-medium transition-colors"
                  >
                    {stage}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
