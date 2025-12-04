const express = require('express');
const router = express.Router();
const UsrController = require('../controllers/users');

router.get('/homedata', UsrController.home);
router.get('/filter-data', UsrController.FltData);
router.get('/training-data', UsrController.TraData);
router.get('/list/:type', UsrController.list);
router.post('/create', UsrController.create);
router.put('/update/:id', UsrController.update);
router.post('/logout', UsrController.logout);

module.exports = router;
