
const express = require('express');
const router = express.Router();
const ct_grp = require('../controllers/group');

router.post('/createGroup', ct_grp.createGroupWithMembers);
router.get('/getGroups', ct_grp.getAllGroupsWithMembers);
router.get('/getGroups_byId/:id', ct_grp.getGroupsWithMembers_byId);
router.put('/updateGroup/:groupId', ct_grp.updateGroup);
router.get('/getMembersWithoutGroup', ct_grp.getMembersWithoutGroup);

module.exports = router;