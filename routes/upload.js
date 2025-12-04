const express = require('express');
const router = express.Router();
const ct_up = require('../controllers/upload');

router.post('/', ct_up.file);

module.exports = router;
