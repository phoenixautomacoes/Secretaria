import { useState } from "react";
import { useListAppointments, useListProfessionals, useUpdateAppointment, useCancelAppointment, useCreateAppointment, useListPatients } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, Plus, Clock, User, Stethoscope } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; bg: string }> = {
  agendado: { label: "Agendado", variant: "secondary", bg: "bg-blue-500/10 text-blue-300 border-blue-500/20" },
  confirmado: { label: "Confirmado", variant: "default", bg: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
  cancelado: { label: "Cancelado", variant: "destructive", bg: "bg-red-500/10 text-red-400 border-red-500/20 opacity-50" },
  realizado: { label: "Realizado", variant: "outline", bg: "bg-zinc-800/40 text-zinc-500 border-zinc-700/40" },
  no_show: { label: "No-show", variant: "destructive", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

export default function Agenda() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [proFilter, setProFilter] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newAptForm, setNewAptForm] = useState({
    patientId: "",
    professionalId: "",
    startTime: "",
    durationMinutes: "60",
    procedure: "",
  });

  const weekEnd = addDays(weekStart, 6);

  const { data: appointments, isLoading } = useListAppointments({
    dateFrom: weekStart.toISOString().split("T")[0],
    dateTo: weekEnd.toISOString().split("T")[0],
    professionalId: proFilter !== "todos" ? Number(proFilter) : undefined,
  });

  const { data: professionals } = useListProfessionals();
  const { data: patientsData } = useListPatients({ limit: 200 });
  const updateAppointment = useUpdateAppointment();
  const cancelAppointment = useCancelAppointment();
  const createAppointment = useCreateAppointment();

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getAptForDay = (day: Date) =>
    (appointments ?? []).filter((a) => a.startTime && isSameDay(new Date(a.startTime), day));

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await updateAppointment.mutateAsync({ id, data: { status: status as any } });
      toast({ title: "Status atualizado!" });
      queryClient.invalidateQueries({ queryKey: ["listAppointments"] });
      setSelectedApt(null);
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await cancelAppointment.mutateAsync({ id });
      toast({ title: "Consulta cancelada" });
      queryClient.invalidateQueries({ queryKey: ["listAppointments"] });
      setSelectedApt(null);
    } catch {
      toast({ title: "Erro ao cancelar", variant: "destructive" });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAppointment.mutateAsync({
        data: {
          patientId: Number(newAptForm.patientId),
          professionalId: Number(newAptForm.professionalId),
          startTime: new Date(newAptForm.startTime).toISOString() as any,
          durationMinutes: Number(newAptForm.durationMinutes),
          procedure: newAptForm.procedure || undefined,
        },
      });
      toast({ title: "Consulta agendada!" });
      queryClient.invalidateQueries({ queryKey: ["listAppointments"] });
      setDialogOpen(false);
      setNewAptForm({ patientId: "", professionalId: "", startTime: "", durationMinutes: "60", procedure: "" });
    } catch {
      toast({ title: "Erro ao agendar", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Agenda</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {format(weekStart, "dd 'de' MMM", { locale: ptBR })} – {format(weekEnd, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={proFilter} onValueChange={setProFilter}>
            <SelectTrigger className="w-48 bg-zinc-900 border-zinc-700/60 text-zinc-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="todos" className="text-zinc-300 focus:bg-zinc-800">Todos os profissionais</SelectItem>
              {professionals?.map((p) => (
                <SelectItem key={p.id} value={String(p.id)} className="text-zinc-300 focus:bg-zinc-800">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))} className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))} className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))} className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20">
                <Plus className="w-4 h-4" />Nova Consulta
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#111118] border-zinc-800">
              <DialogHeader>
                <DialogTitle className="text-zinc-100">Agendar Consulta</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-zinc-400">Paciente *</Label>
                  <Select value={newAptForm.patientId} onValueChange={(v) => setNewAptForm({ ...newAptForm, patientId: v })}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-200">
                      <SelectValue placeholder="Selecionar paciente..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {patientsData?.data?.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)} className="text-zinc-300 focus:bg-zinc-800">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-400">Profissional *</Label>
                  <Select value={newAptForm.professionalId} onValueChange={(v) => setNewAptForm({ ...newAptForm, professionalId: v })}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-200">
                      <SelectValue placeholder="Selecionar profissional..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {professionals?.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)} className="text-zinc-300 focus:bg-zinc-800">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-400">Data e hora *</Label>
                  <Input
                    type="datetime-local"
                    value={newAptForm.startTime}
                    onChange={(e) => setNewAptForm({ ...newAptForm, startTime: e.target.value })}
                    required
                    className="bg-zinc-900 border-zinc-700 text-zinc-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-400">Duração (minutos)</Label>
                  <Select value={newAptForm.durationMinutes} onValueChange={(v) => setNewAptForm({ ...newAptForm, durationMinutes: v })}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-200"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {["30", "45", "60", "90", "120"].map((d) => (
                        <SelectItem key={d} value={d} className="text-zinc-300 focus:bg-zinc-800">{d} min</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-400">Procedimento</Label>
                  <Input
                    placeholder="Ex: Limpeza dental"
                    value={newAptForm.procedure}
                    onChange={(e) => setNewAptForm({ ...newAptForm, procedure: e.target.value })}
                    className="bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="flex-1 border-zinc-700 text-zinc-400 hover:bg-zinc-800" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500" disabled={createAppointment.isPending || !newAptForm.patientId || !newAptForm.professionalId}>
                    {createAppointment.isPending ? "Agendando..." : "Agendar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendário semanal */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-2 min-w-[700px]">
          {days.map((day) => {
            const dayApts = getAptForDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className="min-h-[200px]">
                <div className={cn(
                  "text-center py-2 mb-2 rounded-lg text-sm font-medium",
                  isToday ? "bg-blue-600 shadow-lg shadow-blue-600/25" : "bg-zinc-900/60"
                )}>
                  <p className={cn("text-[11px] uppercase font-medium", isToday ? "text-blue-200" : "text-zinc-600")}>
                    {format(day, "EEE", { locale: ptBR })}
                  </p>
                  <p className={cn("text-lg font-bold", isToday ? "text-white" : "text-zinc-300")}>
                    {format(day, "dd")}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {isLoading ? (
                    <div className="h-12 bg-zinc-800/40 rounded animate-pulse" />
                  ) : dayApts.length === 0 ? (
                    <p className="text-xs text-zinc-800 text-center py-4">—</p>
                  ) : (
                    dayApts.map((apt) => {
                      const statusCfg = STATUS_CONFIG[apt.status ?? "agendado"] ?? STATUS_CONFIG["agendado"]!;
                      return (
                        <button
                          key={apt.id}
                          onClick={() => setSelectedApt(apt)}
                          className={cn(
                            "w-full text-left p-2 rounded-lg border text-xs transition-all hover:opacity-80 cursor-pointer",
                            statusCfg.bg
                          )}
                          style={{ borderLeftColor: apt.professionalColor ?? "#888", borderLeftWidth: 2 }}
                        >
                          <p className="font-semibold">{format(new Date(apt.startTime!), "HH:mm")}</p>
                          <p className="truncate opacity-90">{apt.patientName}</p>
                          <p className="truncate opacity-60 text-[10px]">{apt.professionalName}</p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal detalhe */}
      <Dialog open={!!selectedApt} onOpenChange={(open) => !open && setSelectedApt(null)}>
        <DialogContent className="bg-[#111118] border-zinc-800">
          {selectedApt && (
            <>
              <DialogHeader>
                <DialogTitle className="text-zinc-100">Detalhes da Consulta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2.5 bg-zinc-900/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-zinc-600" />
                    <span className="font-medium text-zinc-200">{selectedApt.patientName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Stethoscope className="w-4 h-4 text-zinc-600" />
                    <span>{selectedApt.professionalName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Clock className="w-4 h-4 text-zinc-600" />
                    <span>
                      {format(new Date(selectedApt.startTime), "dd/MM/yyyy HH:mm", { locale: ptBR })} · {selectedApt.durationMinutes}min
                    </span>
                  </div>
                  {selectedApt.procedure && (
                    <p className="text-sm text-zinc-400">
                      Procedimento: <span className="text-zinc-200 font-medium">{selectedApt.procedure}</span>
                    </p>
                  )}
                  <Badge variant={STATUS_CONFIG[selectedApt.status ?? "agendado"]?.variant}>
                    {STATUS_CONFIG[selectedApt.status ?? "agendado"]?.label}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-600 uppercase tracking-wide">Ações</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedApt.status === "agendado" && (
                      <Button size="sm" onClick={() => handleStatusChange(selectedApt.id, "confirmado")} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                        Confirmar
                      </Button>
                    )}
                    {(selectedApt.status === "agendado" || selectedApt.status === "confirmado") && (
                      <Button size="sm" onClick={() => handleStatusChange(selectedApt.id, "realizado")} variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                        Marcar Realizado
                      </Button>
                    )}
                    {(selectedApt.status === "agendado" || selectedApt.status === "confirmado") && (
                      <Button size="sm" onClick={() => handleStatusChange(selectedApt.id, "no_show")} variant="outline" className="border-amber-600/40 text-amber-400 hover:bg-amber-950/30">
                        No-show
                      </Button>
                    )}
                    {selectedApt.status !== "cancelado" && selectedApt.status !== "realizado" && (
                      <Button size="sm" variant="destructive" onClick={() => handleCancel(selectedApt.id)}>
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
