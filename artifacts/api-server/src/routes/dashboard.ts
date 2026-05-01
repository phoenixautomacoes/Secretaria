import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { appointmentsTable, patientsTable, pipelineTasksTable, professionalsTable, activityLogTable } from "@workspace/db";
import { and, gte, lte, eq, count, sql, desc } from "drizzle-orm";

const router: IRouter = Router();

const PIPELINE_STAGES = [
  { stage: "novo_lead", label: "Novo Lead", color: "#5B9BD5" },
  { stage: "qualificado", label: "Qualificado", color: "#F4C542" },
  { stage: "agendado", label: "Agendado", color: "#6BBF8A" },
  { stage: "confirmado", label: "Confirmado", color: "#9B7ED8" },
  { stage: "no_show", label: "No-show", color: "#E8735A" },
  { stage: "pos_venda", label: "Pós-venda", color: "#5BA8D5" },
  { stage: "perdido", label: "Perdido", color: "#888888" },
] as const;

router.get("/dashboard/summary", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const [todayCount, weekCount, totalPatients, statusCounts, stageCounts, proCounts, professionals] = await Promise.all([
      db.select({ cnt: count() }).from(appointmentsTable).where(and(gte(appointmentsTable.startTime, today), lte(appointmentsTable.startTime, todayEnd))),
      db.select({ cnt: count() }).from(appointmentsTable).where(and(gte(appointmentsTable.startTime, weekStart), lte(appointmentsTable.startTime, weekEnd))),
      db.select({ cnt: count() }).from(patientsTable),
      db.select({ status: appointmentsTable.status, cnt: count() }).from(appointmentsTable).where(and(gte(appointmentsTable.startTime, today), lte(appointmentsTable.startTime, todayEnd))).groupBy(appointmentsTable.status),
      db.select({ stage: patientsTable.pipelineStage, cnt: sql<number>`count(*)::int` }).from(patientsTable).groupBy(patientsTable.pipelineStage),
      db.select({ professionalId: appointmentsTable.professionalId, cnt: count() }).from(appointmentsTable).where(and(gte(appointmentsTable.startTime, today), lte(appointmentsTable.startTime, todayEnd))).groupBy(appointmentsTable.professionalId),
      db.select().from(professionalsTable),
    ]);

    const statusMap = new Map(statusCounts.map((s) => [s.status, Number(s.cnt)]));
    const stageMap = new Map(stageCounts.map((s) => [s.stage, s.cnt]));
    const proCountMap = new Map(proCounts.map((p) => [p.professionalId, Number(p.cnt)]));
    const proMap = new Map(professionals.map((p) => [p.id, p]));

    res.json({
      todayAppointments: Number(todayCount[0]?.cnt ?? 0),
      weekAppointments: Number(weekCount[0]?.cnt ?? 0),
      totalPatients: Number(totalPatients[0]?.cnt ?? 0),
      confirmed: statusMap.get("confirmado") ?? 0,
      scheduled: statusMap.get("agendado") ?? 0,
      noShow: statusMap.get("no_show") ?? 0,
      pipelineByStage: PIPELINE_STAGES.map((s) => ({
        stage: s.stage,
        label: s.label,
        color: s.color,
        count: stageMap.get(s.stage) ?? 0,
      })),
      appointmentsByProfessional: professionals.map((p) => ({
        professionalId: p.id,
        professionalName: p.name,
        color: p.color,
        count: proCountMap.get(p.id) ?? 0,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/today", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const rows = await db
      .select({
        apt: appointmentsTable,
        patientName: patientsTable.name,
        patientPhone: patientsTable.phone,
        professionalName: professionalsTable.name,
        professionalColor: professionalsTable.color,
      })
      .from(appointmentsTable)
      .leftJoin(patientsTable, eq(appointmentsTable.patientId, patientsTable.id))
      .leftJoin(professionalsTable, eq(appointmentsTable.professionalId, professionalsTable.id))
      .where(and(gte(appointmentsTable.startTime, today), lte(appointmentsTable.startTime, todayEnd)))
      .orderBy(appointmentsTable.startTime);

    const result = rows.map(({ apt, patientName, patientPhone, professionalName, professionalColor }) => ({
      ...apt,
      patientName: patientName ?? "",
      patientPhone: patientPhone ?? "",
      professionalName: professionalName ?? "",
      professionalColor: professionalColor ?? "#888",
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get today's appointments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/activity", async (req, res) => {
  try {
    const limit = parseInt((req.query["limit"] as string) ?? "10") || 10;
    const activities = await db.select().from(activityLogTable).orderBy(desc(activityLogTable.createdAt)).limit(limit);
    res.json(activities);
  } catch (err) {
    req.log.error({ err }, "Failed to get recent activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
