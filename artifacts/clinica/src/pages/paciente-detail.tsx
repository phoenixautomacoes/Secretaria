import { useRoute } from "wouter";
import { useGetPatient, useUpdatePatient } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Phone, Mail, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  novo_lead: { label: "Novo Lead", color: "bg-blue-500/15 text-blue-400 border border-blue-500/20" },
  qualificado: { label: "Qualificado", color: "bg-amber-500/15 text-amber-400 border border-amber-500/20" },
  agendado: { label: "Agendado", color: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" },
  confirmado: { label: "Confirmado", color: "bg-violet-500/15 text-violet-400 border border-violet-500/20" },
  no_show: { label: "No-show", color: "bg-red-500/15 text-red-400 border border-red-500/20" },
  pos_venda: { label: "Pós-venda", color: "bg-sky-500/15 text-sky-400 border border-sky-500/20" },
  perdido: { label: "Perdido", color: "bg-zinc-700/40 text-zinc-500 border border-zinc-700/40" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  agendado: { label: "Agendado", variant: "secondary" },
  confirmado: { label: "Confirmado", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
  realizado: { label: "Realizado", variant: "outline" },
  no_show: { label: "No-show", variant: "destructive" },
};

export default function PacienteDetail() {
  const [, params] = useRoute("/pacientes/:id");
  const id = Number(params?.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patient, isLoading } = useGetPatient({ id });
  const updatePatient = useUpdatePatient();

  const handleStageChange = async (newStage: string) => {
    try {
      await updatePatient.mutateAsync({ id, data: { pipelineStage: newStage as any } });
      toast({ title: "Estágio atualizado!" });
      queryClient.invalidateQueries({ queryKey: ["getPatient", id] });
    } catch {
      toast({ title: "Erro ao atualizar estágio", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-zinc-800/50 rounded animate-pulse" />
        <div className="h-48 bg-zinc-800/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6 text-center text-zinc-600">
        <p>Paciente não encontrado</p>
        <Link href="/pacientes">
          <Button variant="outline" className="mt-4 border-zinc-700 text-zinc-400">Voltar</Button>
        </Link>
      </div>
    );
  }

  const stageCfg = STAGE_CONFIG[patient.pipelineStage ?? "novo_lead"] ?? STAGE_CONFIG["novo_lead"]!;
  const appointments = (patient as any).appointments ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pacientes">
          <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{patient.name}</h1>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${stageCfg.color}`}>
            {stageCfg.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info */}
        <div className="space-y-4">
          <div className="bg-[#111118] border border-zinc-800/60 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Informações</h3>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Phone className="w-4 h-4 text-zinc-600" />
              <a href={`tel:${patient.phone}`} className="hover:text-blue-400 transition-colors">{patient.phone}</a>
            </div>
            {patient.email && (
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <Mail className="w-4 h-4 text-zinc-600" />
                <a href={`mailto:${patient.email}`} className="hover:text-blue-400 transition-colors truncate">{patient.email}</a>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Calendar className="w-4 h-4 text-zinc-700" />
              <span>Cadastrado em {format(new Date(patient.createdAt!), "dd/MM/yyyy", { locale: ptBR })}</span>
            </div>
            {(patient as any).upcomingAppointmentDate && (
              <div className="flex items-center gap-2 text-sm text-blue-400">
                <Clock className="w-4 h-4" />
                <span>Próxima: {format(new Date((patient as any).upcomingAppointmentDate), "dd/MM HH:mm", { locale: ptBR })}</span>
              </div>
            )}
            {patient.notes && (
              <div className="pt-2 border-t border-zinc-800">
                <p className="text-xs text-zinc-600 font-medium mb-1">Observações</p>
                <p className="text-sm text-zinc-400">{patient.notes}</p>
              </div>
            )}
          </div>

          <div className="bg-[#111118] border border-zinc-800/60 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Estágio no Pipeline</h3>
            <Select
              value={patient.pipelineStage ?? "novo_lead"}
              onValueChange={handleStageChange}
              disabled={updatePatient.isPending}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {Object.entries(STAGE_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-zinc-300 focus:bg-zinc-800">{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Histórico */}
        <div className="md:col-span-2">
          <div className="bg-[#111118] border border-zinc-800/60 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800/60">
              <h3 className="text-sm font-semibold text-zinc-200">
                Histórico de Consultas <span className="text-zinc-600 font-normal">({appointments.length})</span>
              </h3>
            </div>
            <div className="p-4">
              {appointments.length === 0 ? (
                <div className="text-center py-10 text-zinc-600">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Nenhuma consulta registrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {appointments.map((apt: any) => {
                    const statusCfg = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG["agendado"]!;
                    return (
                      <div
                        key={apt.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/40 hover:bg-zinc-800/20 transition-colors"
                      >
                        <div
                          className="w-1 h-12 rounded-full flex-shrink-0"
                          style={{ backgroundColor: apt.professionalColor ?? "#888" }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm text-zinc-200">{apt.procedure ?? "Consulta"}</p>
                            <Badge variant={statusCfg.variant} className="text-[10px] px-1.5 py-0">
                              {statusCfg.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-500">{apt.professionalName}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-medium text-zinc-300">
                            {format(new Date(apt.startTime), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-zinc-600">
                            {format(new Date(apt.startTime), "HH:mm")} · {apt.durationMinutes}min
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
