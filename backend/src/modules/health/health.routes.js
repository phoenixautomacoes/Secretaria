const { Router } = require('express');
const { check } = require('./health.controller');

const router = Router();
router.get('/', check);

module.exports = router;
