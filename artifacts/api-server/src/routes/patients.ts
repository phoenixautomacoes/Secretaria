import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { patientsTable, appointmentsTable, pipelineTasksTable, activityLogTable, professionalsTable } from "@workspace/db";
import { eq, ilike, or, and, gte, desc, sql } from "drizzle-orm";
import { CreatePatientBody, UpdatePatientBody, ListPatientsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/patients", async (req, res) => {
  try {
    const query = ListPatientsQueryParams.parse(req.query);
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;

    let conditions: any[] = [];
    if (query.search) {
      conditions.push(
        or(
          ilike(patientsTable.name, `%${query.search}%`),
          ilike(patientsTable.phone, `%${query.search}%`)
        )
      );
    }
    if (query.pipelineStage) {
      conditions.push(eq(patientsTable.pipelineStage, query.pipelineStage as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [patients, totalRow] = await Promise.all([
      db.select().from(patientsTable).where(whereClause).limit(limit).offset(offset).orderBy(desc(patientsTable.createdAt)),
      db.select({ cnt: sql<number>`count(*)::int` }).from(patientsTable).where(whereClause),
    ]);

    const now = new Date();
    const upcoming = await db
      .select({ patientId: appointmentsTable.patientId, startTime: appointmentsTable.startTime })
      .from(appointmentsTable)
      .where(and(gte(appointmentsTable.startTime, now), eq(appointmentsTable.status, "agendado" as any)));

    const upcomingMap = new Map<number, Date>();
    for (const u of upcoming) {
      if (!upcomingMap.has(u.patientId)) upcomingMap.set(u.patientId, u.startTime);
    }

    const result = patients.map((p) => ({
      ...p,
      upcomingAppointmentDate: upcomingMap.get(p.id)?.toISOString() ?? null,
    }));

    res.json({ data: result, total: totalRow[0]?.cnt ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to list patients");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/patients", async (req, res) => {
  try {
    const body = CreatePatientBody.parse(req.body);

    const [patient] = await db.insert(patientsTable).values({
      name: body.name,
      phone: body.phone,
      email: body.email,
      pipelineStage: (body.pipelineStage as any) ?? "novo_lead",
      notes: body.notes,
      preferredProfessionalId: body.preferredProfessionalId,
    }).returning();

    if (!patient) return res.status(500).json({ error: "Failed to create patient" });

    await db.insert(pipelineTasksTable).values({
      patientId: patient.id,
      stage: patient.pipelineStage as any,
    });

    await db.insert(activityLogTable).values({
      type: "patient_created",
      description: `Novo paciente cadastrado`,
      patientName: patient.name,
      patientId: patient.id,
    });

    res.status(201).json({ ...patient, upcomingAppointmentDate: null });
  } catch (err) {
    req.log.error({ err }, "Failed to create patient");
    res.status(400).json({ error: "Invalid data" });
  }
});

router.get("/patients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "");
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, id));
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const appointments = await db
      .select({
        apt: appointmentsTable,
        professionalName: professionalsTable.name,
        professionalColor: professionalsTable.color,
      })
      .from(appointmentsTable)
      .leftJoin(professionalsTable, eq(appointmentsTable.professionalId, professionalsTable.id))
      .where(eq(appointmentsTable.patientId, id))
      .orderBy(desc(appointmentsTable.startTime));

    const formattedAppointments = appointments.map(({ apt, professionalName, professionalColor }) => ({
      ...apt,
      patientName: patient.name,
      patientPhone: patient.phone,
      professionalName: professionalName ?? "",
      professionalColor: professionalColor ?? "#888",
    }));

    const now = new Date();
    const upcoming = formattedAppointments.find((a) => new Date(a.startTime) >= now && a.status === "agendado");

    res.json({
      ...patient,
      upcomingAppointmentDate: upcoming?.startTime?.toISOString() ?? null,
      appointments: formattedAppointments,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get patient");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/patients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "");
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const body = UpdatePatientBody.parse(req.body);

    const [patient] = await db
      .update(patientsTable)
      .set({
        name: body.name,
        phone: body.phone,
        email: body.email,
        pipelineStage: body.pipelineStage as any,
        notes: body.notes,
        preferredProfessionalId: body.preferredProfessionalId,
        lastConsultationDate: body.lastConsultationDate,
      })
      .where(eq(patientsTable.id, id))
      .returning();

    if (!patient) return res.status(404).json({ error: "Patient not found" });

    if (body.pipelineStage) {
      await db
        .update(pipelineTasksTable)
        .set({ stage: body.pipelineStage as any, updatedAt: new Date() })
        .where(eq(pipelineTasksTable.patientId, id));
    }

    res.json({ ...patient, upcomingAppointmentDate: null });
  } catch (err) {
    req.log.error({ err }, "Failed to update patient");
    res.status(400).json({ error: "Invalid data" });
  }
});

export default router;
