const express = require('express');
const router = express.Router();
const UsrController = require('../controllers/users');
const profile_upload= require('../controllers/profile_upload');
const bulk_upload= require('../controllers/bulk-upload');

router.get('/homedata', UsrController.home);
router.get('/filter-data', UsrController.FltData);
router.get('/training-data', UsrController.TraData);
router.get('/list/:type', UsrController.list);
router.post('/create', UsrController.create);
router.put('/update/:id', UsrController.update);
router.post('/logout', UsrController.logout);

router.use('/profile-upload', profile_upload);
router.use('/bulk', bulk_upload);


module.exports = router;
