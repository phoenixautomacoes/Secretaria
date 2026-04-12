const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Admin padrão
  const adminHash = await bcrypt.hash('admin@123456', 12);
  await prisma.user.upsert({
    where: { email: 'rgbarcellos@gmail.com' },
    update: { passwordHash: adminHash },
    create: {
      name: 'Administrador',
      email: 'rgbarcellos@gmail.com',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });
  console.log('Admin criado: rgbarcellos@gmail.com / admin@123456');

  // Recepcionista
  const recHash = await bcrypt.hash('recepc123', 12);
  await prisma.user.upsert({
    where: { email: 'recepcao@clinica.com' },
    update: {},
    create: {
      name: 'Recepcionista',
      email: 'recepcao@clinica.com',
      passwordHash: recHash,
      role: 'RECEPTIONIST',
    },
  });
  console.log('Recepcionista criada: recepcao@clinica.com / recepc123');

  // Configurações da clínica (singleton)
  await prisma.clinicSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      name: 'Clínica Phoenix',
      whatsappNumber: '5551995595300',
      timezone: 'America/Sao_Paulo',
      workingHours: {
        start: '08:00',
        end: '18:00',
        days: [1, 2, 3, 4, 5],
      },
      aiEnabled: true,
    },
  });
  console.log('Configurações da clínica criadas');

  // Automações padrão — usar deleteMany + createMany para evitar duplicatas
  await prisma.automationRule.deleteMany({});
  await prisma.automationRule.createMany({
    data: [
      {
        name: 'Boas-vindas ao Lead',
        trigger: 'PATIENT_QUALIFIED',
        actions: [{ type: 'send_ai_message', params: { agent: 'followUp' } }],
        delayMinutes: 0,
        isActive: true,
      },
      {
        name: 'Lembrete 24h',
        trigger: 'APPOINTMENT_REMINDER_24H',
        actions: [{ type: 'send_ai_message', params: { agent: 'reminder', window: '24h' } }],
        delayMinutes: 0,
        isActive: true,
      },
      {
        name: 'Lembrete 1h',
        trigger: 'APPOINTMENT_REMINDER_1H',
        actions: [{ type: 'send_ai_message', params: { agent: 'reminder', window: '1h' } }],
        delayMinutes: 0,
        isActive: true,
      },
      {
        name: 'Follow-up no-show',
        trigger: 'APPOINTMENT_NO_SHOW',
        actions: [{ type: 'send_ai_message', params: { agent: 'postConsult', situation: 'no_show' } }],
        delayMinutes: 30,
        isActive: true,
      },
      {
        name: 'Follow-up pós-consulta',
        trigger: 'APPOINTMENT_COMPLETED',
        actions: [{ type: 'send_ai_message', params: { agent: 'postConsult', situation: 'attended' } }],
        delayMinutes: 60,
        isActive: true,
      },
      {
        name: 'Reengajamento 48h',
        trigger: 'NO_RESPONSE_48H',
        actions: [{ type: 'send_ai_message', params: { agent: 'followUp' } }],
        delayMinutes: 0,
        isActive: true,
      },
    ],
  });
  console.log('6 automações criadas');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
