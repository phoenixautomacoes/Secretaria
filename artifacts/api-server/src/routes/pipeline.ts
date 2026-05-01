import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { pipelineTasksTable, patientsTable, activityLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdatePipelineTaskBody } from "@workspace/api-zod";

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

router.get("/pipeline/tasks", async (req, res) => {
  try {
    const tasks = await db
      .select({
        task: pipelineTasksTable,
        patientName: patientsTable.name,
        patientPhone: patientsTable.phone,
      })
      .from(pipelineTasksTable)
      .leftJoin(patientsTable, eq(pipelineTasksTable.patientId, patientsTable.id))
      .orderBy(pipelineTasksTable.updatedAt);

    const tasksByStage = PIPELINE_STAGES.map((s) => ({
      stage: s.stage,
      label: s.label,
      color: s.color,
      tasks: tasks
        .filter((t) => t.task.stage === s.stage)
        .map((t) => ({
          ...t.task,
          patientName: t.patientName ?? "",
          patientPhone: t.patientPhone ?? "",
        })),
    }));

    res.json(tasksByStage);
  } catch (err) {
    req.log.error({ err }, "Failed to list pipeline tasks");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/pipeline/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "");
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const body = UpdatePipelineTaskBody.parse(req.body);

    const updateData: Partial<typeof pipelineTasksTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.stage) updateData.stage = body.stage as any;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.dueDate) updateData.dueDate = new Date(body.dueDate as unknown as string);

    const [task] = await db.update(pipelineTasksTable).set(updateData).where(eq(pipelineTasksTable.id, id)).returning();
    if (!task) return res.status(404).json({ error: "Task not found" });

    if (body.stage) {
      await db.update(patientsTable).set({ pipelineStage: body.stage as any }).where(eq(patientsTable.id, task.patientId));
      const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, task.patientId));
      const stageLabel = PIPELINE_STAGES.find((s) => s.stage === body.stage)?.label ?? body.stage;
      await db.insert(activityLogTable).values({
        type: "stage_changed",
        description: `Movido para ${stageLabel}`,
        patientName: patient?.name ?? "",
        patientId: task.patientId,
      });
    }

    const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, task.patientId));
    res.json({ ...task, patientName: patient?.name ?? "", patientPhone: patient?.phone ?? "" });
  } catch (err) {
    req.log.error({ err }, "Failed to update pipeline task");
    res.status(400).json({ error: "Invalid data" });
  }
});

export default router;
