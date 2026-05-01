import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { appointmentsTable, patientsTable, professionalsTable, pipelineTasksTable, activityLogTable } from "@workspace/db";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import { CreateAppointmentBody, UpdateAppointmentBody } from "@workspace/api-zod";
import { createCalendarEvent, updateCalendarEvent, cancelCalendarEvent } from "../lib/google-calendar";

const router: IRouter = Router();

async function enrichAppointments(rows: typeof appointmentsTable.$inferSelect[]) {
  if (rows.length === 0) return [];

  const patientIds = [...new Set(rows.map((r) => r.patientId))];
  const proIds = [...new Set(rows.map((r) => r.professionalId))];

  const [patients, professionals] = await Promise.all([
    db.select().from(patientsTable).where(inArray(patientsTable.id, patientIds as [number, ...number[]])),
    db.select().from(professionalsTable).where(inArray(professionalsTable.id, proIds as [number, ...number[]])),
  ]);

  const patientMap = new Map(patients.map((p) => [p.id, p]));
  const proMap = new Map(professionals.map((p) => [p.id, p]));

  return rows.map((apt) => {
    const patient = patientMap.get(apt.patientId);
    const professional = proMap.get(apt.professionalId);
    return {
      ...apt,
      patientName: patient?.name ?? "",
      patientPhone: patient?.phone ?? "",
      professionalName: professional?.name ?? "",
      professionalColor: professional?.color ?? "#888",
    };
  });
}

router.get("/appointments", async (req, res) => {
  try {
    const q = req.query as Record<string, string>;

    const conditions: any[] = [];
    if (q["professionalId"]) conditions.push(eq(appointmentsTable.professionalId, Number(q["professionalId"])));
    if (q["patientId"]) conditions.push(eq(appointmentsTable.patientId, Number(q["patientId"])));
    if (q["status"]) conditions.push(eq(appointmentsTable.status, q["status"] as any));
    if (q["date"]) {
      const d = new Date(q["date"]);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      conditions.push(and(gte(appointmentsTable.startTime, d), lte(appointmentsTable.startTime, end)));
    } else {
      if (q["dateFrom"]) conditions.push(gte(appointmentsTable.startTime, new Date(q["dateFrom"])));
      if (q["dateTo"]) {
        const end = new Date(q["dateTo"]);
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(appointmentsTable.startTime, end));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await db.select().from(appointmentsTable).where(whereClause).orderBy(appointmentsTable.startTime);
    const enriched = await enrichAppointments(rows);
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to list appointments");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/appointments", async (req, res) => {
  try {
    const body = CreateAppointmentBody.parse(req.body);

    const startTime = new Date(body.startTime as unknown as string);
    const endTime = new Date(startTime.getTime() + body.durationMinutes * 60 * 1000);

    const [patient, professional] = await Promise.all([
      db.select().from(patientsTable).where(eq(patientsTable.id, body.patientId)).then((r) => r[0]),
      db.select().from(professionalsTable).where(eq(professionalsTable.id, body.professionalId)).then((r) => r[0]),
    ]);

    const [appointment] = await db
      .insert(appointmentsTable)
      .values({
        patientId: body.patientId,
        professionalId: body.professionalId,
        startTime,
        endTime,
        durationMinutes: body.durationMinutes,
        status: "agendado",
        procedure: body.procedure,
        notes: body.notes,
      })
      .returning();

    if (!appointment) return res.status(500).json({ error: "Failed to create appointment" });

    // Sync to Google Calendar (fire-and-forget, don't block response)
    createCalendarEvent({
      summary: `🦷 ${patient?.name ?? "Paciente"} — ${body.procedure ?? "Consulta"}`,
      description: [
        `Profissional: ${professional?.name ?? ""}`,
        body.procedure ? `Procedimento: ${body.procedure}` : "",
        body.notes ? `Obs: ${body.notes}` : "",
      ].filter(Boolean).join("\n"),
      startTime,
      endTime,
    }).then((eventId) => {
      if (eventId) {
        db.update(appointmentsTable)
          .set({ googleCalendarEventId: eventId })
          .where(eq(appointmentsTable.id, appointment.id))
          .catch(() => {});
      }
    });

    await db.update(pipelineTasksTable).set({ stage: "agendado", updatedAt: new Date() }).where(eq(pipelineTasksTable.patientId, body.patientId));
    await db.update(patientsTable).set({ pipelineStage: "agendado" }).where(eq(patientsTable.id, body.patientId));
    await db.insert(activityLogTable).values({
      type: "appointment_created",
      description: `Consulta agendada`,
      patientName: patient?.name ?? "",
      patientId: body.patientId,
    });

    const enriched = await enrichAppointments([appointment]);
    res.status(201).json(enriched[0]!);
  } catch (err) {
    req.log.error({ err }, "Failed to create appointment");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.get("/appointments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "");
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [row] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id));
    if (!row) return res.status(404).json({ error: "Appointment not found" });

    const enriched = await enrichAppointments([row]);
    res.json(enriched[0]!);
  } catch (err) {
    req.log.error({ err }, "Failed to get appointment");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/appointments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "");
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const body = UpdateAppointmentBody.parse(req.body);

    const updateData: Partial<typeof appointmentsTable.$inferInsert> = {};
    if (body.status) updateData.status = body.status as any;
    if (body.procedure !== undefined) updateData.procedure = body.procedure;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.startTime) {
      const startTime = new Date(body.startTime as unknown as string);
      updateData.startTime = startTime;
      if (body.durationMinutes) {
        updateData.endTime = new Date(startTime.getTime() + body.durationMinutes * 60 * 1000);
        updateData.durationMinutes = body.durationMinutes;
      }
    }

    const [appointment] = await db.update(appointmentsTable).set(updateData).where(eq(appointmentsTable.id, id)).returning();
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    // Sync status change to Google Calendar
    if (appointment.googleCalendarEventId) {
      if (body.status === "cancelado") {
        cancelCalendarEvent(appointment.googleCalendarEventId);
      } else if (body.status === "confirmado") {
        updateCalendarEvent(appointment.googleCalendarEventId, {
          summary: `✅ ${appointment.googleCalendarEventId ? "" : ""}Consulta Confirmada`,
        });
      } else if (body.status && body.startTime) {
        const startTime = new Date(body.startTime as unknown as string);
        const endTime = new Date(startTime.getTime() + (appointment.durationMinutes ?? 60) * 60 * 1000);
        updateCalendarEvent(appointment.googleCalendarEventId, { startTime, endTime });
      }
    }

    if (body.status === "confirmado") {
      await db.update(pipelineTasksTable).set({ stage: "confirmado", updatedAt: new Date() }).where(eq(pipelineTasksTable.patientId, appointment.patientId));
      await db.update(patientsTable).set({ pipelineStage: "confirmado" }).where(eq(patientsTable.id, appointment.patientId));
    } else if (body.status === "realizado") {
      await db.update(pipelineTasksTable).set({ stage: "pos_venda", updatedAt: new Date() }).where(eq(pipelineTasksTable.patientId, appointment.patientId));
      await db.update(patientsTable).set({ pipelineStage: "pos_venda" }).where(eq(patientsTable.id, appointment.patientId));
    } else if (body.status === "no_show") {
      await db.update(pipelineTasksTable).set({ stage: "no_show", updatedAt: new Date() }).where(eq(pipelineTasksTable.patientId, appointment.patientId));
      await db.update(patientsTable).set({ pipelineStage: "no_show" }).where(eq(patientsTable.id, appointment.patientId));
    }

    const enriched = await enrichAppointments([appointment]);
    res.json(enriched[0]!);
  } catch (err) {
    req.log.error({ err }, "Failed to update appointment");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.delete("/appointments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "");
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [appointment] = await db.update(appointmentsTable).set({ status: "cancelado" }).where(eq(appointmentsTable.id, id)).returning();
    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    // Cancel the Google Calendar event
    if (appointment.googleCalendarEventId) {
      cancelCalendarEvent(appointment.googleCalendarEventId);
    }

    const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, appointment.patientId));
    await db.insert(activityLogTable).values({
      type: "appointment_cancelled",
      description: `Consulta cancelada`,
      patientName: patient?.name ?? "",
      patientId: appointment.patientId,
    });

    const enriched = await enrichAppointments([appointment]);
    res.json(enriched[0]!);
  } catch (err) {
    req.log.error({ err }, "Failed to cancel appointment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
