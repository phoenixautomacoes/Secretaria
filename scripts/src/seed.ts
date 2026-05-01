import { db } from "@workspace/db";
import {
  professionalsTable,
  patientsTable,
  appointmentsTable,
  pipelineTasksTable,
  activityLogTable,
} from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  const existingPros = await db.select().from(professionalsTable);
  if (existingPros.length > 0) {
    console.log("Database already seeded. Skipping.");
    process.exit(0);
  }

  const [anaCostaRow] = await db
    .insert(professionalsTable)
    .values({
      name: "Dra. Ana Costa",
      slug: "ana-costa",
      specialty: "Clínico Geral",
      color: "#5B9BD5",
      appointmentDurationMinutes: 60,
      workingHours: { start: "08:00", end: "18:00" },
      workingDays: [1, 2, 3, 4, 5],
    })
    .returning();

  const [ricardoRow] = await db
    .insert(professionalsTable)
    .values({
      name: "Dr. Ricardo Lima",
      slug: "ricardo-lima",
      specialty: "Ortodontia",
      color: "#6BBF8A",
      appointmentDurationMinutes: 90,
      workingHours: { start: "09:00", end: "19:00" },
      workingDays: [1, 2, 3, 4, 5],
    })
    .returning();

  const [beatrizRow] = await db
    .insert(professionalsTable)
    .values({
      name: "Dra. Beatriz Souza",
      slug: "beatriz-souza",
      specialty: "Endodontia",
      color: "#F4C542",
      appointmentDurationMinutes: 120,
      workingHours: { start: "08:00", end: "17:00" },
      workingDays: [1, 2, 3, 4, 5],
    })
    .returning();

  const [felipeRow] = await db
    .insert(professionalsTable)
    .values({
      name: "Dr. Felipe Torres",
      slug: "felipe-torres",
      specialty: "Implantodontia",
      color: "#9B7ED8",
      appointmentDurationMinutes: 120,
      workingHours: { start: "10:00", end: "20:00" },
      workingDays: [1, 2, 3, 4, 5, 6],
    })
    .returning();

  const pros = [anaCostaRow!, ricardoRow!, beatrizRow!, felipeRow!];

  const patientsData = [
    { name: "Maria Silva", phone: "11987654321", email: "maria@email.com", stage: "confirmado" as const, proIdx: 0 },
    { name: "João Santos", phone: "11912345678", email: "joao@email.com", stage: "agendado" as const, proIdx: 1 },
    { name: "Ana Oliveira", phone: "11998887766", email: "ana@email.com", stage: "novo_lead" as const, proIdx: 0 },
    { name: "Carlos Ferreira", phone: "11955443322", email: "carlos@email.com", stage: "qualificado" as const, proIdx: 2 },
    { name: "Fernanda Lima", phone: "11966778899", email: "fernanda@email.com", stage: "pos_venda" as const, proIdx: 1 },
    { name: "Roberto Costa", phone: "11911223344", email: "roberto@email.com", stage: "novo_lead" as const, proIdx: 3 },
    { name: "Juliana Pereira", phone: "11977665544", email: "juliana@email.com", stage: "agendado" as const, proIdx: 2 },
    { name: "Marcos Alves", phone: "11933445566", email: "marcos@email.com", stage: "no_show" as const, proIdx: 0 },
    { name: "Patrícia Ramos", phone: "11944556677", email: "patricia@email.com", stage: "perdido" as const, proIdx: 3 },
    { name: "Diego Martins", phone: "11922334455", email: "diego@email.com", stage: "qualificado" as const, proIdx: 1 },
    { name: "Amanda Torres", phone: "11988776655", email: "amanda@email.com", stage: "confirmado" as const, proIdx: 2 },
    { name: "Paulo Rodrigues", phone: "11900112233", email: "paulo@email.com", stage: "agendado" as const, proIdx: 3 },
  ];

  const patientRows = [];
  for (const pd of patientsData) {
    const [p] = await db
      .insert(patientsTable)
      .values({
        name: pd.name,
        phone: pd.phone,
        email: pd.email,
        pipelineStage: pd.stage,
        preferredProfessionalId: pros[pd.proIdx]?.id,
      })
      .returning();
    if (p) patientRows.push({ patient: p, proIdx: pd.proIdx });
  }

  for (const { patient, proIdx } of patientRows) {
    await db.insert(pipelineTasksTable).values({
      patientId: patient.id,
      stage: patient.pipelineStage as any,
    });
  }

  const now = new Date();

  const appointmentTemplates = [
    { patientIdx: 0, proIdx: 0, hoursOffset: 1, procedure: "Consulta de rotina" },
    { patientIdx: 1, hoursOffset: 2, procedure: "Avaliação ortodôntica" },
    { patientIdx: 6, hoursOffset: 3, procedure: "Canal radicular" },
    { patientIdx: 11, hoursOffset: 4, procedure: "Implante dentário" },
    { patientIdx: 10, hoursOffset: 5, procedure: "Retorno ortodôntico" },
    { patientIdx: 0, hoursOffset: -48, procedure: "Limpeza dental", status: "realizado" as const },
    { patientIdx: 4, hoursOffset: -72, procedure: "Clareamento", status: "realizado" as const },
    { patientIdx: 7, hoursOffset: -24, procedure: "Consulta geral", status: "no_show" as const },
    { patientIdx: 1, hoursOffset: 24 * 2, procedure: "Moldagem ortodôntica" },
    { patientIdx: 2, hoursOffset: 24 * 3, procedure: "Primeira consulta" },
    { patientIdx: 3, hoursOffset: 24 * 4, procedure: "Avaliação endodôntica" },
    { patientIdx: 5, hoursOffset: 24 * 5, procedure: "Consulta inicial" },
  ];

  const procedures = ["Consulta de rotina", "Limpeza dental", "Clareamento", "Canal radicular", "Implante dentário", "Avaliação ortodôntica"];

  for (let i = 0; i < appointmentTemplates.length; i++) {
    const t = appointmentTemplates[i]!;
    const patientData = patientRows[t.patientIdx];
    if (!patientData) continue;
    const proIdx = t.proIdx ?? patientData.proIdx;
    const pro = pros[proIdx];
    if (!pro) continue;

    const startTime = new Date(now.getTime() + t.hoursOffset * 60 * 60 * 1000);
    startTime.setMinutes(0, 0, 0);

    const duration = pro.appointmentDurationMinutes;
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    const status = t.status ?? (t.hoursOffset > 0 ? "agendado" : "realizado");

    await db.insert(appointmentsTable).values({
      patientId: patientData.patient.id,
      professionalId: pro.id,
      startTime,
      endTime,
      durationMinutes: duration,
      status: status as any,
      procedure: t.procedure,
    });
  }

  const activityEntries = [
    { type: "appointment_created" as const, description: "Consulta agendada", patientName: "Maria Silva", patientId: patientRows[0]?.patient.id },
    { type: "appointment_confirmed" as const, description: "Consulta confirmada", patientName: "Amanda Torres", patientId: patientRows[10]?.patient.id },
    { type: "stage_changed" as const, description: "Movido para Pós-venda", patientName: "Fernanda Lima", patientId: patientRows[4]?.patient.id },
    { type: "appointment_completed" as const, description: "Consulta realizada", patientName: "Fernanda Lima", patientId: patientRows[4]?.patient.id },
    { type: "appointment_created" as const, description: "Consulta agendada", patientName: "João Santos", patientId: patientRows[1]?.patient.id },
    { type: "patient_created" as const, description: "Novo paciente cadastrado", patientName: "Paulo Rodrigues", patientId: patientRows[11]?.patient.id },
  ];

  for (const entry of activityEntries) {
    await db.insert(activityLogTable).values({
      type: entry.type,
      description: entry.description,
      patientName: entry.patientName,
      patientId: entry.patientId,
    });
  }

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
