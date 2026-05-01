import { useGetDashboardSummary, useGetTodayAppointments, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users, CheckCircle, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";

const STAGE_LABELS: Record<string, string> = {
  novo_lead: "Novo Lead",
  qualificado: "Qualificado",
  agendado: "Agendado",
  confirmado: "Confirmado",
  no_show: "No-show",
  pos_venda: "Pós-venda",
  perdido: "Perdido",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  agendado: { label: "Agendado", variant: "secondary" },
  confirmado: { label: "Confirmado", variant: "default" },
  cancelado: { label: "Cancelado", variant: "destructive" },
  realizado: { label: "Realizado", variant: "outline" },
  no_show: { label: "No-show", variant: "destructive" },
};

const ACTIVITY_ICONS: Record<string, string> = {
  appointment_created: "📅",
  appointment_confirmed: "✅",
  appointment_cancelled: "❌",
  appointment_completed: "🎉",
  patient_created: "👤",
  stage_changed: "🔄",
};

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: todayApts, isLoading: loadingToday } = useGetTodayAppointments();
  const { data: activity, isLoading: loadingActivity } = useGetRecentActivity({ limit: 8 });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: "Consultas Hoje",
            value: loadingSummary ? "—" : (summary?.todayAppointments ?? 0),
            icon: CalendarDays,
            iconColor: "text-blue-400",
            iconBg: "bg-blue-500/10",
            glow: "shadow-blue-500/5",
          },
          {
            label: "Consultas na Semana",
            value: loadingSummary ? "—" : (summary?.weekAppointments ?? 0),
            icon: TrendingUp,
            iconColor: "text-emerald-400",
            iconBg: "bg-emerald-500/10",
            glow: "shadow-emerald-500/5",
          },
          {
            label: "Total de Pacientes",
            value: loadingSummary ? "—" : (summary?.totalPatients ?? 0),
            icon: Users,
            iconColor: "text-violet-400",
            iconBg: "bg-violet-500/10",
            glow: "shadow-violet-500/5",
          },
          {
            label: "Confirmados Hoje",
            value: loadingSummary ? "—" : (summary?.confirmed ?? 0),
            icon: CheckCircle,
            iconColor: "text-amber-400",
            iconBg: "bg-amber-500/10",
            glow: "shadow-amber-500/5",
          },
        ].map((m) => (
          <div
            key={m.label}
            className={`bg-[#111118] border border-zinc-800/60 rounded-xl p-5 flex items-center justify-between shadow-lg ${m.glow}`}
          >
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{m.label}</p>
              <p className="text-3xl font-bold text-zinc-100 mt-1">{m.value}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl ${m.iconBg} flex items-center justify-center flex-shrink-0`}>
              <m.icon className={`w-5 h-5 ${m.iconColor}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Consultas de hoje */}
        <div className="xl:col-span-2">
          <div className="bg-[#111118] border border-zinc-800/60 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
              <h2 className="text-sm font-semibold text-zinc-200">Consultas de Hoje</h2>
              <Link href="/agenda">
                <span className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer transition-colors">Ver agenda →</span>
              </Link>
            </div>
            <div className="p-4">
              {loadingToday ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-14 bg-zinc-800/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : !todayApts || todayApts.length === 0 ? (
                <div className="text-center py-10 text-zinc-600">
                  <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma consulta agendada para hoje</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todayApts.map((apt) => {
                    const statusCfg = STATUS_CONFIG[apt.status ?? "agendado"] ?? STATUS_CONFIG["agendado"]!;
                    return (
                      <div
                        key={apt.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800/40 hover:bg-zinc-800/30 transition-colors"
                      >
                        <div
                          className="w-1 h-10 rounded-full flex-shrink-0"
                          style={{ backgroundColor: apt.professionalColor ?? "#888" }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-zinc-200 truncate">{apt.patientName}</p>
                            <Badge variant={statusCfg.variant} className="text-[10px] px-1.5 py-0">
                              {statusCfg.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-500 truncate">
                            {apt.professionalName} · {apt.procedure ?? "Consulta"}
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm font-semibold text-zinc-300">
                            {format(new Date(apt.startTime!), "HH:mm")}
                          </p>
                          <p className="text-xs text-zinc-600">{apt.durationMinutes}min</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Atividade recente */}
        <div className="bg-[#111118] border border-zinc-800/60 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/60">
            <h2 className="text-sm font-semibold text-zinc-200">Atividade Recente</h2>
          </div>
          <div className="p-4">
            {loadingActivity ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-zinc-800/50 rounded animate-pulse" />
                ))}
              </div>
            ) : !activity || activity.length === 0 ? (
              <p className="text-sm text-zinc-600 text-center py-6">Sem atividade recente</p>
            ) : (
              <div className="space-y-3.5">
                {activity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3">
                    <span className="text-base leading-none mt-0.5">
                      {ACTIVITY_ICONS[item.type ?? ""] ?? "📌"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-300 truncate">{item.patientName}</p>
                      <p className="text-xs text-zinc-500 truncate">{item.description}</p>
                      <p className="text-xs text-zinc-700">
                        {format(new Date(item.createdAt!), "dd/MM HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline por estágio */}
      {summary?.pipelineByStage && (
        <div className="bg-[#111118] border border-zinc-800/60 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60">
            <h2 className="text-sm font-semibold text-zinc-200">Pipeline de Leads</h2>
            <Link href="/pipeline">
              <span className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer transition-colors">Ver Kanban →</span>
            </Link>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {summary.pipelineByStage.map((stage) => (
                <div
                  key={stage.stage}
                  className="text-center p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/40"
                  style={{ borderTopColor: stage.color ?? "#888", borderTopWidth: 2 }}
                >
                  <p className="text-2xl font-bold text-zinc-100">{stage.count}</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {STAGE_LABELS[stage.stage ?? ""] ?? stage.stage}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Por profissional */}
      {summary?.appointmentsByProfessional && (
        <div className="bg-[#111118] border border-zinc-800/60 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/60">
            <h2 className="text-sm font-semibold text-zinc-200">Consultas por Profissional (Hoje)</h2>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {summary.appointmentsByProfessional.map((p) => (
              <div key={p.professionalId} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/40">
                <div
                  className="w-2.5 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p.color ?? "#888" }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{p.professionalName}</p>
                  <p className="text-xs text-zinc-500">{p.count} consulta{p.count !== 1 ? "s" : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
