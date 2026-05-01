import { useListProfessionals } from "@workspace/api-client-react";
import { CalendarCheck, Clock, Briefcase } from "lucide-react";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function Profissionais() {
  const { data: professionals, isLoading } = useListProfessionals();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Profissionais</h1>
        <p className="text-zinc-500 text-sm mt-1">Equipe de dentistas da clínica</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {professionals?.map((pro) => (
            <div
              key={pro.id}
              className="bg-[#111118] border border-zinc-800/60 rounded-xl overflow-hidden hover:border-zinc-700/60 transition-colors"
            >
              <div className="h-1" style={{ backgroundColor: pro.color ?? "#888" }} />
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg"
                      style={{ backgroundColor: pro.color ?? "#888", boxShadow: `0 4px 12px ${pro.color}40` }}
                    >
                      {pro.name?.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-100">{pro.name}</p>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Briefcase className="w-3 h-3" /> {pro.specialty}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-zinc-800/60 text-zinc-300 text-xs px-2.5 py-1 rounded-full border border-zinc-700/40 flex-shrink-0">
                    <CalendarCheck className="w-3 h-3 text-blue-400" />
                    {pro.appointmentCount} hoje
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Clock className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-xs">
                      {(pro.workingHours as any)?.start ?? "08:00"} – {(pro.workingHours as any)?.end ?? "18:00"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Clock className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-xs">{pro.appointmentDurationMinutes}min / consulta</span>
                  </div>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {DAY_LABELS.map((label, idx) => {
                    const days = (pro.workingDays as any as number[]) ?? [];
                    const active = days.includes(idx);
                    return (
                      <span
                        key={idx}
                        className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                          active
                            ? "bg-blue-500/15 text-blue-400 border border-blue-500/20"
                            : "bg-zinc-800/40 text-zinc-600 border border-zinc-800/40"
                        }`}
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
