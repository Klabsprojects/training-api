
const express = require('express');
const router = express.Router();
const ct_grp = require('../controllers/group');

router.post('/createGroup', ct_grp.createGroupWithMembers);
router.get('/getGroups', ct_grp.getAllGroupsWithMembers);
router.put('/updateGroup/:groupId', ct_grp.updateGroup);
router.get('/getMembersWithoutGroup', ct_grp.getMembersWithoutGroup);

module.exports = router;