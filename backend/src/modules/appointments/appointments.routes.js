const { Router } = require('express');
const ctrl = require('./appointments.controller');

const router = Router();

router.get('/slots', ctrl.getSlots);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
