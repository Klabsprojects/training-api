
const express = require('express');
const router = express.Router();
const ct_frm = require('../controllers/forms');

router.get('/', ct_frm.list);
router.post('/', ct_frm.create);
router.put('/:id', ct_frm.update);
router.get('/detail/:id', ct_frm.getById);
router.get('/participants/:id', ct_frm.getparts);
router.get('/sent-rec/:id', ct_frm.getFrmSts);

module.exports = router;
