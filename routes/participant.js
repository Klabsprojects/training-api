
const express = require('express');
const router = express.Router();
const ct_part = require('../controllers/participant');

router.get('/list/*', ct_part.list);
router.post('/', ct_part.create);
router.put('/:id', ct_part.update);
router.post('/bank-verification', ct_part.memVerBank);
router.get('/detail/:id', ct_part.memDet);
router.get('/report/:id', ct_part.Rpt);

router.get('/certificate', ct_part.memcert);

module.exports = router;
