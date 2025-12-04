
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const ct_mst = require('../controllers/master');

router.get('/training', ct_mst.tlist);
router.post('/training', ct_mst.tcreate);
router.put('/training/:id', ct_mst.tupdate);
router.get('/training/:id', ct_mst.tgetById);

router.get('/location', ct_mst.llist);
router.post('/location', ct_mst.lcreate);
router.put('/location/:id', ct_mst.lupdate);
router.get('/location/:id', ct_mst.lgetById);

router.get('/accomdation', ct_mst.alist);
router.post('/accomdation', ct_mst.acreate);
router.put('/accomdation/:id', ct_mst.aupdate);
router.get('/accomdation/:id', ct_mst.alist);

router.get('/:type', ct_mst.getList);

//new apis for checklist
router.post('/createChecklist', ct_mst.createChecklist);
router.get('/:type/getChecklist', ct_mst.getChecklist);
router.put('/:type/updateChecklist', ct_mst.updateChecklist);
router.get('/:type/getChecklist/:rootId', ct_mst.getChecklistById);

module.exports = router;
