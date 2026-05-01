/**
 * Webhook endpoints para integração com n8n (WhatsApp → Chatwoot → n8n → Painel)
 *
 * Endpoints disponíveis:
 *   POST /api/webhook/n8n/agendamento-criado     - Chamado pelo workflow 03 após criar evento no Google Calendar
 *   POST /api/webhook/n8n/agendamento-cancelado  - Chamado pelo workflow 06 após cancelar evento
 *   POST /api/webhook/n8n/agendamento-atualizado - Chamado pelo workflow 05 após atualizar evento
 *   POST /api/webhook/n8n/pipeline-atualizado    - Chamado pelo workflow 01 quando muda estágio
 *
 * Segurança: defina a variável de ambiente WEBHOOK_SECRET.
 * O n8n deve enviar o header: x-webhook-secret: <valor>
 */

import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import {
  patientsTable,
  professionalsTable,
  appointmentsTable,
  pipelineTasksTable,
  activityLogTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// ─── Middleware de autenticação ───────────────────────────────────────────────
function verifySecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env["WEBHOOK_SECRET"];
  if (!secret) return next(); // sem secret configurado: aceita tudo (dev)

  const provided =
    req.headers["x-webhook-secret"] ||
    req.headers["authorization"]?.replace("Bearer ", "");

  if (provided !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

router.use("/webhook/n8n", verifySecret);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Upsert de paciente por telefone. Retorna o paciente existente ou cria um novo. */
async function upsertPatient(params: {
  phone: string;
  name?: string;
  pipelineStage?: string;
  preferredProfessionalId?: number;
}) {
  const phone = params.phone.replace(/\s/g, "");

  const [existing] = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.phone, phone));

  if (existing) {
    // Atualiza nome se veio vazio antes
    const updates: Partial<typeof patientsTable.$inferInsert> = {};
    if (params.name && existing.name !== params.name) updates.name = params.name;
    if (params.pipelineStage && existing.pipelineStage !== params.pipelineStage)
      updates.pipelineStage = params.pipelineStage as any;
    if (params.preferredProfessionalId)
      updates.preferredProfessionalId = params.preferredProfessionalId;

    if (Object.keys(updates).length > 0) {
      const [updated] = await db
        .update(patientsTable)
        .set(updates)
        .where(eq(patientsTable.id, existing.id))
        .returning();
      return updated ?? existing;
    }
    return existing;
  }

  const [created] = await db
    .insert(patientsTable)
    .values({
      phone,
      name: params.name ?? phone,
      pipelineStage: (params.pipelineStage as any) ?? "novo_lead",
      preferredProfessionalId: params.preferredProfessionalId,
    })
    .returning();

  return created!;
}

/** Garante que existe um PipelineTask para o paciente. */
async function ensurePipelineTask(patientId: number, stage: string) {
  const [existing] = await db
    .select()
    .from(pipelineTasksTable)
    .where(eq(pipelineTasksTable.patientId, patientId));

  if (existing) {
    await db
      .update(pipelineTasksTable)
      .set({ stage: stage as any, updatedAt: new Date() })
      .where(eq(pipelineTasksTable.patientId, patientId));
  } else {
    await db.insert(pipelineTasksTable).values({
      patientId,
      stage: stage as any,
    });
  }
}

// ─── POST /webhook/n8n/agendamento-criado ─────────────────────────────────────
/**
 * Chamado pelo workflow 03 (Criar evento com profissional) depois que o
 * evento foi criado no Google Calendar com sucesso.
 *
 * Body esperado:
 * {
 *   "telefone": "+5551999559300",
 *   "nome": "João Silva",
 *   "id_profissional": "dra-ana-costa",   // slug do profissional
 *   "evento_inicio": "2026-05-15T10:00:00-03:00",
 *   "duracao_minutos": 60,
 *   "procedimento": "Limpeza dental",      // opcional
 *   "id_evento_google": "abc123xyz",       // ID do evento no Google Calendar
 *   "notas": "..."                         // opcional
 * }
 */
router.post("/webhook/n8n/agendamento-criado", async (req, res) => {
  try {
    const {
      telefone,
      nome,
      id_profissional,
      evento_inicio,
      duracao_minutos,
      procedimento,
      id_evento_google,
      notas,
    } = req.body;

    if (!telefone || !id_profissional || !evento_inicio) {
      return res.status(400).json({
        error: "Campos obrigatórios: telefone, id_profissional, evento_inicio",
      });
    }

    // 1. Buscar profissional pelo slug
    // Aceita "dra-ana-costa", "dr-ana-costa" e "ana-costa" (normaliza removendo prefixo dra-/dr-)
    const slugNormalized = id_profissional.replace(/^dr[a]?-/, "");
    const [professional] = await db
      .select()
      .from(professionalsTable)
      .where(eq(professionalsTable.slug, slugNormalized))
      .then(async (rows) => {
        if (rows.length) return rows;
        // Tenta com o slug original caso o banco use o formato completo
        return db.select().from(professionalsTable).where(eq(professionalsTable.slug, id_profissional));
      });

    if (!professional) {
      return res.status(404).json({
        error: `Profissional não encontrado: ${id_profissional}`,
        dica: "Verifique se o slug bate com o cadastro. Slugs disponíveis: dra-ana-costa, dr-ricardo-lima, dra-beatriz-souza, dr-felipe-torres",
      });
    }

    // 2. Upsert do paciente
    const patient = await upsertPatient({
      phone: telefone,
      name: nome,
      pipelineStage: "agendado",
      preferredProfessionalId: professional.id,
    });

    // 3. Calcular horários
    const startTime = new Date(evento_inicio);
    const duration = Number(duracao_minutos) || professional.appointmentDurationMinutes;
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    // 4. Criar agendamento
    const [appointment] = await db
      .insert(appointmentsTable)
      .values({
        patientId: patient.id,
        professionalId: professional.id,
        startTime,
        endTime,
        durationMinutes: duration,
        status: "agendado",
        procedure: procedimento ?? null,
        notes: notas ?? null,
        googleCalendarEventId: id_evento_google ?? null,
      })
      .returning();

    // 5. Atualizar pipeline
    await ensurePipelineTask(patient.id, "agendado");

    // 6. Log de atividade
    await db.insert(activityLogTable).values({
      type: "appointment_created",
      description: `Agendado via WhatsApp${procedimento ? ` — ${procedimento}` : ""}`,
      patientName: patient.name,
      patientId: patient.id,
    });

    req.log.info({ appointmentId: appointment!.id, patient: patient.name }, "Webhook: agendamento criado");

    return res.status(201).json({
      ok: true,
      agendamento_id: appointment!.id,
      paciente_id: patient.id,
      mensagem: "Agendamento registrado no painel com sucesso",
    });
  } catch (err) {
    req.log.error({ err }, "Webhook: erro ao criar agendamento");
    return res.status(500).json({ error: "Erro interno" });
  }
});

// ─── POST /webhook/n8n/agendamento-cancelado ─────────────────────────────────
/**
 * Chamado pelo workflow 06 (Cancelar agendamento) após cancelar no Google Calendar.
 *
 * Body esperado:
 * {
 *   "id_evento_google": "abc123xyz",
 *   "telefone": "+5551999559300",   // alternativa se não tiver id_evento_google
 *   "motivo": "Paciente cancelou"   // opcional
 * }
 */
router.post("/webhook/n8n/agendamento-cancelado", async (req, res) => {
  try {
    const { id_evento_google, telefone, motivo } = req.body;

    if (!id_evento_google && !telefone) {
      return res.status(400).json({
        error: "Informe id_evento_google ou telefone",
      });
    }

    let appointment: typeof appointmentsTable.$inferSelect | undefined;

    // Buscar por ID do evento Google Calendar
    if (id_evento_google) {
      const [found] = await db
        .select()
        .from(appointmentsTable)
        .where(eq(appointmentsTable.googleCalendarEventId, id_evento_google));
      appointment = found;
    }

    // Fallback: buscar pelo telefone do paciente (último agendamento ativo)
    if (!appointment && telefone) {
      const phone = telefone.replace(/\s/g, "");
      const [patient] = await db
        .select()
        .from(patientsTable)
        .where(eq(patientsTable.phone, phone));

      if (patient) {
        const [found] = await db
          .select()
          .from(appointmentsTable)
          .where(
            and(
              eq(appointmentsTable.patientId, patient.id),
              eq(appointmentsTable.status, "agendado")
            )
          )
          .orderBy(appointmentsTable.startTime);
        appointment = found;
      }
    }

    if (!appointment) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    // Cancelar
    await db
      .update(appointmentsTable)
      .set({ status: "cancelado" })
      .where(eq(appointmentsTable.id, appointment.id));

    // Atualizar pipeline
    await ensurePipelineTask(appointment.patientId, "perdido");
    await db
      .update(patientsTable)
      .set({ pipelineStage: "perdido" })
      .where(eq(patientsTable.id, appointment.patientId));

    // Log
    const [patient] = await db
      .select()
      .from(patientsTable)
      .where(eq(patientsTable.id, appointment.patientId));

    await db.insert(activityLogTable).values({
      type: "appointment_cancelled",
      description: `Cancelado via WhatsApp${motivo ? ` — ${motivo}` : ""}`,
      patientName: patient?.name ?? "",
      patientId: appointment.patientId,
    });

    req.log.info({ appointmentId: appointment.id }, "Webhook: agendamento cancelado");

    return res.json({
      ok: true,
      agendamento_id: appointment.id,
      mensagem: "Agendamento cancelado no painel",
    });
  } catch (err) {
    req.log.error({ err }, "Webhook: erro ao cancelar agendamento");
    return res.status(500).json({ error: "Erro interno" });
  }
});

// ─── POST /webhook/n8n/agendamento-atualizado ────────────────────────────────
/**
 * Chamado pelo workflow 05 (Atualizar agendamento) após reagendar no Google Calendar.
 *
 * Body esperado:
 * {
 *   "id_evento_google": "abc123xyz",
 *   "novo_inicio": "2026-05-16T14:00:00-03:00",   // opcional
 *   "duracao_minutos": 60,                          // opcional
 *   "procedimento": "Nova limpeza"                  // opcional
 * }
 */
router.post("/webhook/n8n/agendamento-atualizado", async (req, res) => {
  try {
    const { id_evento_google, novo_inicio, duracao_minutos, procedimento } = req.body;

    if (!id_evento_google) {
      return res.status(400).json({ error: "id_evento_google é obrigatório" });
    }

    const [appointment] = await db
      .select()
      .from(appointmentsTable)
      .where(eq(appointmentsTable.googleCalendarEventId, id_evento_google));

    if (!appointment) {
      return res.status(404).json({ error: "Agendamento não encontrado" });
    }

    const updates: Partial<typeof appointmentsTable.$inferInsert> = {};

    if (novo_inicio) {
      const startTime = new Date(novo_inicio);
      updates.startTime = startTime;
      const duration = Number(duracao_minutos) || appointment.durationMinutes;
      updates.endTime = new Date(startTime.getTime() + duration * 60 * 1000);
      updates.durationMinutes = duration;
    } else if (duracao_minutos) {
      updates.durationMinutes = Number(duracao_minutos);
      updates.endTime = new Date(
        appointment.startTime.getTime() + Number(duracao_minutos) * 60 * 1000
      );
    }

    if (procedimento) updates.procedure = procedimento;

    await db
      .update(appointmentsTable)
      .set(updates)
      .where(eq(appointmentsTable.id, appointment.id));

    req.log.info({ appointmentId: appointment.id }, "Webhook: agendamento atualizado");

    return res.json({
      ok: true,
      agendamento_id: appointment.id,
      mensagem: "Agendamento atualizado no painel",
    });
  } catch (err) {
    req.log.error({ err }, "Webhook: erro ao atualizar agendamento");
    return res.status(500).json({ error: "Erro interno" });
  }
});

// ─── POST /webhook/n8n/pipeline-atualizado ───────────────────────────────────
/**
 * Chamado pelo workflow 01 quando o estágio do paciente muda no Chatwoot/n8n.
 * Permite manter o pipeline do painel sincronizado com o Chatwoot.
 *
 * Body esperado:
 * {
 *   "telefone": "+5551999559300",
 *   "nome": "João Silva",           // opcional — atualiza se vier
 *   "estagio": "qualificado"        // novo_lead | qualificado | agendado | confirmado | no_show | pos_venda | perdido
 * }
 */
router.post("/webhook/n8n/pipeline-atualizado", async (req, res) => {
  try {
    const { telefone, nome, estagio } = req.body;

    const STAGES_VALID = [
      "novo_lead", "qualificado", "agendado", "confirmado",
      "no_show", "pos_venda", "perdido",
    ];

    if (!telefone || !estagio) {
      return res.status(400).json({ error: "telefone e estagio são obrigatórios" });
    }

    if (!STAGES_VALID.includes(estagio)) {
      return res.status(400).json({
        error: `Estágio inválido: ${estagio}`,
        estagios_validos: STAGES_VALID,
      });
    }

    const patient = await upsertPatient({ phone: telefone, name: nome, pipelineStage: estagio });

    await ensurePipelineTask(patient.id, estagio);

    await db.insert(activityLogTable).values({
      type: "stage_changed",
      description: `Pipeline atualizado via WhatsApp → ${estagio}`,
      patientName: patient.name,
      patientId: patient.id,
    });

    req.log.info({ patientId: patient.id, estagio }, "Webhook: pipeline atualizado");

    return res.json({
      ok: true,
      paciente_id: patient.id,
      estagio_atual: estagio,
      mensagem: "Pipeline atualizado no painel",
    });
  } catch (err) {
    req.log.error({ err }, "Webhook: erro ao atualizar pipeline");
    return res.status(500).json({ error: "Erro interno" });
  }
});

// ─── GET /webhook/n8n/status ──────────────────────────────────────────────────
/** Healthcheck do webhook — útil para testar a conexão no n8n */
router.get("/webhook/n8n/status", (_req, res) => {
  res.json({
    ok: true,
    protegido: !!process.env["WEBHOOK_SECRET"],
    endpoints: [
      "POST /api/webhook/n8n/agendamento-criado",
      "POST /api/webhook/n8n/agendamento-cancelado",
      "POST /api/webhook/n8n/agendamento-atualizado",
      "POST /api/webhook/n8n/pipeline-atualizado",
    ],
  });
});

export default router;
