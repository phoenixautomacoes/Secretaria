const { Router } = require('express');
const { getStatus } = require('./whatsapp.controller');

const router = Router();
router.get('/status', getStatus);

module.exports = router;
