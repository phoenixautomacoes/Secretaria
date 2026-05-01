import { useListPipelineTasks, useUpdatePipelineTask } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone } from "lucide-react";

export default function Pipeline() {
  const { data: columns, isLoading } = useListPipelineTasks();
  const updateTask = useUpdatePipelineTask();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [draggingTask, setDraggingTask] = useState<any>(null);
  const [draggingFrom, setDraggingFrom] = useState<string>("");
  const [dragOver, setDragOver] = useState<string>("");

  const handleDragStart = (task: any, stage: string) => {
    setDraggingTask(task);
    setDraggingFrom(stage);
  };

  const handleDrop = async (targetStage: string) => {
    setDragOver("");
    if (!draggingTask || draggingFrom === targetStage) {
      setDraggingTask(null);
      return;
    }
    try {
      await updateTask.mutateAsync({ id: draggingTask.id, data: { stage: targetStage as any } });
      toast({ title: `${draggingTask.patientName} movido` });
      queryClient.invalidateQueries({ queryKey: ["listPipelineTasks"] });
    } catch {
      toast({ title: "Erro ao mover card", variant: "destructive" });
    }
    setDraggingTask(null);
    setDraggingFrom("");
  };

  const handleMoveTask = async (task: any, newStage: string) => {
    try {
      await updateTask.mutateAsync({ id: task.id, data: { stage: newStage as any } });
      queryClient.invalidateQueries({ queryKey: ["listPipelineTasks"] });
    } catch {
      toast({ title: "Erro ao mover", variant: "destructive" });
    }
  };

  const allStages = columns?.map((c) => ({ stage: c.stage!, label: c.label! })) ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Pipeline de Leads</h1>
        <p className="text-zinc-500 text-sm mt-1">Arraste os cards para mover entre estágios</p>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="w-52 flex-shrink-0 h-64 bg-zinc-800/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px]">
          {(columns ?? []).map((col) => {
            const color = col.color ?? "#888";
            const isOver = dragOver === col.stage;
            return (
              <div
                key={col.stage}
                className={`flex-shrink-0 w-52 rounded-xl transition-colors ${
                  isOver ? "bg-zinc-800/40 ring-1 ring-zinc-600/40" : ""
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(col.stage ?? ""); }}
                onDragLeave={() => setDragOver("")}
                onDrop={() => handleDrop(col.stage ?? "")}
              >
                {/* Column header */}
                <div className="mb-3 px-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-xs font-semibold text-zinc-300">{col.label}</span>
                    </div>
                    <span className="text-[11px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full font-medium border border-zinc-700/50">
                      {col.tasks?.length ?? 0}
                    </span>
                  </div>
                  <div className="h-px rounded-full opacity-60" style={{ backgroundColor: color }} />
                </div>

                {/* Cards */}
                <div className="space-y-2 px-0.5 min-h-[60px]">
                  {(col.tasks ?? []).map((task: any) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task, col.stage ?? "")}
                      className="bg-[#111118] border border-zinc-800/60 rounded-xl p-3 shadow-md cursor-grab active:cursor-grabbing hover:border-zinc-700/60 transition-all hover:shadow-lg"
                    >
                      <Link href={`/pacientes/${task.patientId}`}>
                        <p className="font-medium text-sm text-zinc-200 truncate hover:text-blue-400 cursor-pointer transition-colors">
                          {task.patientName}
                        </p>
                      </Link>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-600 mt-1">
                        <Phone className="w-3 h-3" />
                        <span className="truncate">{task.patientPhone}</span>
                      </div>
                      {task.notes && (
                        <p className="text-[11px] text-zinc-600 mt-1.5 line-clamp-2 italic">{task.notes}</p>
                      )}
                      <div className="mt-2.5">
                        <Select value={task.stage} onValueChange={(v) => handleMoveTask(task, v)}>
                          <SelectTrigger className="h-7 text-[11px] py-0 px-2 bg-zinc-900 border-zinc-700/60 text-zinc-400">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-zinc-900 border-zinc-700">
                            {allStages.map((s) => (
                              <SelectItem key={s.stage} value={s.stage} className="text-[11px] text-zinc-300 focus:bg-zinc-800">
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
