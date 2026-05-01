import { useState } from "react";
import { useListPatients, useCreatePatient, useListProfessionals } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Phone, ChevronRight, User } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  novo_lead: { label: "Novo Lead", color: "bg-blue-500/15 text-blue-400 border border-blue-500/20" },
  qualificado: { label: "Qualificado", color: "bg-amber-500/15 text-amber-400 border border-amber-500/20" },
  agendado: { label: "Agendado", color: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" },
  confirmado: { label: "Confirmado", color: "bg-violet-500/15 text-violet-400 border border-violet-500/20" },
  no_show: { label: "No-show", color: "bg-red-500/15 text-red-400 border border-red-500/20" },
  pos_venda: { label: "Pós-venda", color: "bg-sky-500/15 text-sky-400 border border-sky-500/20" },
  perdido: { label: "Perdido", color: "bg-zinc-700/40 text-zinc-500 border border-zinc-700/40" },
};

export default function Pacientes() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    pipelineStage: "novo_lead",
    preferredProfessionalId: "",
  });

  const { data, isLoading } = useListPatients({
    search: search || undefined,
    pipelineStage: stageFilter === "todos" ? undefined : (stageFilter as any),
    limit: 50,
  });

  const { data: professionals } = useListProfessionals();
  const createPatient = useCreatePatient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPatient.mutateAsync({
        data: {
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          pipelineStage: form.pipelineStage as any,
          preferredProfessionalId: form.preferredProfessionalId ? Number(form.preferredProfessionalId) : undefined,
        },
      });
      toast({ title: "Paciente cadastrado com sucesso!" });
      setDialogOpen(false);
      setForm({ name: "", phone: "", email: "", pipelineStage: "novo_lead", preferredProfessionalId: "" });
      queryClient.invalidateQueries({ queryKey: ["listPatients"] });
    } catch {
      toast({ title: "Erro ao cadastrar paciente", variant: "destructive" });
    }
  };

  const patients = data?.data ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Pacientes</h1>
          <p className="text-zinc-500 text-sm mt-1">{data?.total ?? 0} pacientes cadastrados</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20">
              <Plus className="w-4 h-4" />
              Novo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#111118] border-zinc-800">
            <DialogHeader>
              <DialogTitle className="text-zinc-100">Cadastrar Paciente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label className="text-zinc-400">Nome *</Label>
                <Input
                  placeholder="Nome completo"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400">Telefone *</Label>
                <Input
                  placeholder="(51) 99999-9999"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400">E-mail</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400">Estágio no Pipeline</Label>
                <Select value={form.pipelineStage} onValueChange={(v) => setForm({ ...form, pipelineStage: v })}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {Object.entries(STAGE_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-zinc-300 focus:bg-zinc-800">{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-400">Profissional preferido</Label>
                <Select value={form.preferredProfessionalId} onValueChange={(v) => setForm({ ...form, preferredProfessionalId: v })}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {professionals?.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)} className="text-zinc-300 focus:bg-zinc-800">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" className="flex-1 border-zinc-700 text-zinc-400 hover:bg-zinc-800" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500" disabled={createPatient.isPending}>
                  {createPatient.isPending ? "Salvando..." : "Cadastrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-700/60 text-zinc-200 placeholder:text-zinc-600"
          />
        </div>
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-44 bg-zinc-900 border-zinc-700/60 text-zinc-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="todos" className="text-zinc-300 focus:bg-zinc-800">Todos os estágios</SelectItem>
            {Object.entries(STAGE_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-zinc-300 focus:bg-zinc-800">{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-800/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
          <User className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium text-zinc-500">Nenhum paciente encontrado</p>
          <p className="text-sm text-zinc-600 mt-1">Tente outro filtro ou cadastre um novo paciente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {patients.map((patient) => {
            const stageCfg = STAGE_CONFIG[patient.pipelineStage ?? "novo_lead"] ?? STAGE_CONFIG["novo_lead"]!;
            return (
              <Link key={patient.id} href={`/pacientes/${patient.id}`}>
                <div className="flex items-center gap-4 p-4 bg-[#111118] rounded-xl border border-zinc-800/60 hover:border-zinc-700/60 hover:bg-[#14141c] transition-all cursor-pointer group">
                  <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-zinc-200">{patient.name}</p>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${stageCfg.color}`}>
                        {stageCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span>{patient.phone}</span>
                      {patient.upcomingAppointmentDate && (
                        <>
                          <span className="mx-1 text-zinc-700">·</span>
                          <span className="text-blue-400">
                            Próxima: {format(new Date(patient.upcomingAppointmentDate), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 flex-shrink-0 transition-colors" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
