
const express = require('express');
const router = express.Router();
const ct_qust = require('../controllers/quest');

router.get('/', ct_qust.list);
router.post('/', ct_qust.create);
router.put('/:id', ct_qust.update);
router.get('/detail/:id', ct_qust.getById);
router.get('/selected', ct_qust.selected);

module.exports = router;
