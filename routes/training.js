
const express = require('express');
const router = express.Router();
const ct_tra = require('../controllers/training');
const ct_up = require('../controllers/upload');

router.get('/', ct_tra.list);
router.post('/', ct_tra.create);
router.put('/:id', ct_tra.update);
router.get('/detail/:id', ct_tra.getById);
router.get('/participants/:id', ct_tra.getparts);
router.get('/testmsg', ct_tra.tstmsg);
router.get('/attendance/:id', ct_tra.getTraAtt);
router.get('/forms/:id', ct_tra.getTrafrms);
router.get('/forms/:id/:par-type/:fid', ct_tra.getFrmsPar);
router.get('/response/:type/:fid', ct_tra.getResponse);

router.post('/participants-invite/:id', ct_tra.sendmessage);
router.post('/trainer-invite/:id', ct_tra.sendTmessage);
router.post('/coordinator-invite/:id', ct_tra.sendTmessage);
router.post('/participants-materials/:id', ct_tra.sendTraMat);
router.get('/report/:id', ct_tra.rptData);
router.get('/feedback/:id', ct_tra.FBres);
router.get('/feedback/:id/:type', ct_tra.FBRaw);
router.get('/fb-detail/:trainings/:senders', ct_tra.FBDetail);
router.get('/chart/:id/:type', ct_tra.chartData);

router.post('/upload', ct_up.file);

router.put('/checklist/updateAssignmentInfo', ct_tra.updateAssignmentInfo);
router.get('/checklist/getAssignmentInfo/:id', ct_tra.getAssignmentInfo);
router.get('/checklist/getAssignedTrainingsByMember/:memberId', ct_tra.getAssignedTrainingsByMember);
router.put('/checklist/updateAssignmentStatus', ct_tra.updateAssignmentStatus);

router.get('/needForms/:id', ct_tra.getNeedForms);
router.get('/mandatoryTrainingRequirements/:id', ct_tra.validateTrainingRequirements);

module.exports = router;