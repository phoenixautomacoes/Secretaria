import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBoard, moveStage } from '../../api/pipeline';
import KanbanColumn from './KanbanColumn';
import Spinner from '../ui/Spinner';
import { useEffect } from 'react';
import { getSocket } from '../../hooks/useSocket';

export default function KanbanBoard({ onCardClick }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['pipeline'],
    queryFn: getBoard,
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, stage }) => moveStage(id, stage),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline'] }),
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = () => qc.invalidateQueries({ queryKey: ['pipeline'] });
    socket.on('pipeline_stage_changed', handler);
    return () => socket.off('pipeline_stage_changed', handler);
  }, [qc]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const { stages, board } = data;

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => (
        <KanbanColumn
          key={stage}
          stage={stage}
          patients={board[stage] || []}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  );
}
