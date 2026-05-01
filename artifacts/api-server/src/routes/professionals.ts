import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { professionalsTable, appointmentsTable } from "@workspace/db";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/professionals", async (req, res) => {
  try {
    const professionals = await db.select().from(professionalsTable).orderBy(professionalsTable.name);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const countsByPro = await db
      .select({ professionalId: appointmentsTable.professionalId, cnt: count() })
      .from(appointmentsTable)
      .where(and(gte(appointmentsTable.startTime, today), lte(appointmentsTable.startTime, todayEnd)))
      .groupBy(appointmentsTable.professionalId);

    const countMap = new Map(countsByPro.map((c) => [c.professionalId, Number(c.cnt)]));

    const result = professionals.map((p) => ({
      ...p,
      appointmentCount: countMap.get(p.id) ?? 0,
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list professionals");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/professionals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params["id"] ?? "");
    if (isNaN(id)) return res.status(400).json({ error: "Invalid ID" });

    const [professional] = await db.select().from(professionalsTable).where(eq(professionalsTable.id, id));
    if (!professional) return res.status(404).json({ error: "Professional not found" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const [countRow] = await db
      .select({ cnt: count() })
      .from(appointmentsTable)
      .where(and(eq(appointmentsTable.professionalId, id), gte(appointmentsTable.startTime, today), lte(appointmentsTable.startTime, todayEnd)));

    res.json({ ...professional, appointmentCount: Number(countRow?.cnt ?? 0) });
  } catch (err) {
    req.log.error({ err }, "Failed to get professional");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
