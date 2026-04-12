const prisma = require('../../config/prisma');
const AppError = require('../../shared/errors/AppError');
const { parsePagination, buildMeta } = require('../../shared/utils/pagination');
const { getCalendarService } = require('../../integrations/google-calendar');

const list = async (query) => {
  const { page, limit, skip } = parsePagination(query);
  const where = {};

  if (query.patientId) where.patientId = query.patientId;
  if (query.status) where.status = query.status;
  if (query.from || query.to) {
    where.startsAt = {};
    if (query.from) where.startsAt.gte = new Date(query.from);
    if (query.to) where.startsAt.lte = new Date(query.to);
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startsAt: 'asc' },
      include: { patient: { select: { id: true, name: true, phone: true } } },
    }),
    prisma.appointment.count({ where }),
  ]);

  return { appointments, meta: buildMeta(total, page, limit) };
};

const getById = async (id) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { patient: true },
  });
  if (!appointment) throw new AppError('Consulta não encontrada', 404, 'NOT_FOUND');
  return appointment;
};

const create = async (data) => {
  const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
  if (!patient) throw new AppError('Paciente não encontrado', 404, 'NOT_FOUND');

  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(startsAt.getTime() + (data.duration || 60) * 60000);

  const calendar = getCalendarService();
  const googleEventId = await calendar.createEvent({
    patientName: patient.name,
    patientPhone: patient.phone,
    startsAt,
    duration: data.duration || 60,
    notes: data.notes || '',
  }).catch(() => null);

  return prisma.appointment.create({
    data: { ...data, startsAt, endsAt, ...(googleEventId && { googleEventId }) },
    include: { patient: true },
  });
};

const update = async (id, data) => {
  await getById(id);
  const updateData = { ...data };
  if (data.startsAt) {
    updateData.startsAt = new Date(data.startsAt);
    const appt = await getById(id);
    updateData.endsAt = new Date(updateData.startsAt.getTime() + (data.duration || appt.duration) * 60000);
  }
  return prisma.appointment.update({ where: { id }, data: updateData, include: { patient: true } });
};

const remove = async (id) => {
  const appt = await getById(id);

  if (appt.googleEventId) {
    const calendar = getCalendarService();
    await calendar.deleteEvent(appt.googleEventId).catch(() => null);
  }

  await prisma.appointment.delete({ where: { id } });
};

const getSlots = async (date) => {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  const booked = await prisma.appointment.findMany({
    where: {
      startsAt: { gte: day, lte: end },
      status: { notIn: ['CANCELLED'] },
    },
    select: { startsAt: true, duration: true },
  });

  // Slots de 60 min das 08:00 às 18:00
  const slots = [];
  for (let h = 8; h < 18; h++) {
    const slot = new Date(day);
    slot.setHours(h, 0, 0, 0);
    const busy = booked.some((a) => {
      const start = new Date(a.startsAt);
      const finish = new Date(start.getTime() + a.duration * 60000);
      return slot >= start && slot < finish;
    });
    slots.push({ time: slot.toISOString(), available: !busy });
  }

  return slots;
};

module.exports = { list, getById, create, update, remove, getSlots };
