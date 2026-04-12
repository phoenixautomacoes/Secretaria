const router = require('express').Router();
const prisma = require('../../config/prisma');
const { syncAll } = require('../../integrations/google-sheets/sheets.service');
const asyncHandler = require('../../shared/utils/asyncHandler');

// POST /api/sheets/sync — re-sincroniza todos os pacientes na planilha
router.post('/sync', asyncHandler(async (req, res) => {
  const patients = await prisma.patient.findMany({ orderBy: { createdAt: 'asc' } });
  const count = await syncAll(patients);
  res.json({ success: true, synced: count });
}));

module.exports = router;
