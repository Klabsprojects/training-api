const express = require('express');
const router = express.Router();
const ct_usr = require('../controllers/users');
const ct_part = require('../controllers/participant');
const ct_up = require('../controllers/upload');
const ct_res = require('../controllers/response');

router.post('/', ct_usr.login);
router.get('/chk', ct_part.chk);
router.get('/form', ct_part.getfrm);
router.get('/selected', ct_part.selected);
router.post('/upload', ct_up.file);
router.post('/form', ct_res.smtfrm);
router.get('/list/*', ct_part.list);

router.get('/certificate', ct_part.memcert);
router.get('/tada_cal', ct_part.TADACal);

router.post('/sendTrainerConfirmation', ct_res.smtfrm);

router.get('/getTrainer', ct_part.getTrainer);

module.exports = router;