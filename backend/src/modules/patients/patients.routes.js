const { Router } = require('express');
const { list, getById, create, update, remove } = require('./patients.controller');

const router = Router();

router.get('/', list);
router.post('/', create);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
