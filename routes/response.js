const express = require('express');
const router = express.Router();
const ct_res = require('../controllers/response');

router.get('/detail/:id', ct_res.getbyId);
router.get('/list/:type', ct_res.list);

module.exports = router;
