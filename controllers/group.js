const pool = require('../db');  // Your pool export

exports.createGroupWithMembers = (req, res) => {
  pool.getConnection((err, connection) => {  // ← UNCOMMENT THIS
    if (err) {
      return res.status(500).json({ success: false, error: 'Database connection failed' });
    }

    // Use connection directly (not connection.connection)
    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ success: false, error: 'Transaction failed' });
      }

      // 1. Create group - FIXED SQL
      const groupSql = 'INSERT INTO `groups` (name, created_by) VALUES (?, ?)';
      connection.query(groupSql, [req.body.name, req.body.created_by], (groupErr, groupResult) => {
        if (groupErr) {
          console.log('GROUP ERROR:', groupErr);  // ← ADD THIS
          console.log('SQL:', groupSql);
          console.log('Params:', [req.body.name, req.body.created_by]);
          return connection.rollback(() => {
            connection.release();
            res.status(500).json({ success: false, error: 'Group creation failed' });
          });
        }

        const groupId = groupResult.insertId;

         // 2. Add members (bulk insert)
        if (req.body.members && req.body.members.length > 0) {
          const membersSql = 'INSERT INTO group_members (group_id, member_id) VALUES ?';
          const membersValues = req.body.members.map(memberId => [groupId, memberId]);
          
          connection.query(membersSql, [membersValues], (membersErr) => {
            if (membersErr) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ success: false, error: 'Members addition failed' });
              });
            }


            // 3. Commit and fetch result
            commitAndRespond();
          });
        } else {
          // No members, proceed to commit
          commitAndRespond();
        }


        function commitAndRespond() {
          connection.commit((commitErr) => {
            if (commitErr) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ success: false, error: 'Commit failed' });
              });
            }
            const fetchSql = 
  "SELECT g.*, COUNT(gm.member_id) as member_count " +
  "FROM `groups` g " +
  "LEFT JOIN `group_members` gm ON g.id = gm.group_id " +
  "WHERE g.id = ?";

            connection.query(fetchSql, [groupId], (fetchErr, groupData) => {
              connection.release();  // ✅ Always release
              
              if (fetchErr) {
                return res.status(500).json({ success: false, error: 'Fetch failed' });
              }

              res.json({  // ✅ Always respond
                success: true,
                group: groupData[0]
              });
            });
          });
        }
      });
    });
  });
};

exports.getAllGroupsWithMembers = (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Database connection failed' });
    }

    // Query to get all groups with their members
    const groupsSql = `
      SELECT 
        g.id,
        g.name,
        g.created_by,
        g.created_at,
        g.updated_at,
        COUNT(gm.member_id) as member_count,
        GROUP_CONCAT(
          CONCAT(m.id, ':', m.name, ':', m.mobile, ':', m.s_type, ':', m.subject, ':', m.district) 
          SEPARATOR ','
        ) as members
      FROM \`groups\` g
      LEFT JOIN \`group_members\` gm ON g.id = gm.group_id
      LEFT JOIN members m ON gm.member_id = m.id
      GROUP BY g.id, g.name, g.created_by, g.created_at, g.updated_at
      ORDER BY g.created_at DESC
    `;

    connection.query(groupsSql, (err, results) => {
      connection.release();
      
      if (err) {
        console.error('Groups fetch error:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch groups' });
      }

      // Parse members array for each group
      const groups = results.map(group => ({
        id: group.id,
        name: group.name,
        created_by: group.created_by,
        created_at: group.created_at,
        updated_at: group.updated_at,
        member_count: group.member_count || 0,
        members: group.members ? group.members.split(',').map(memberStr => {
          const [id, name, mobile, s_type, subject, district] = memberStr.split(':');
          return { id: parseInt(id), name, mobile, s_type, subject, district };
        }) : []
      }));

      res.json({
        success: true,
        count: groups.length,
        groups: groups
      });
    });
  });
};

exports.updateGroup = (req, res) => {
  const { groupId } = req.params;
  const { name, members } = req.body;

  // Validate groupId
  if (!groupId || isNaN(groupId)) {
    return res.status(400).json({ success: false, error: 'Valid groupId required' });
  }

  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Database connection failed' });
    }

    connection.beginTransaction((err) => {
      if (err) {
        connection.release();
        return res.status(500).json({ success: false, error: 'Transaction failed' });
      }

      // 1. Get current group members
      connection.query(
        "SELECT member_id FROM `group_members` WHERE group_id = ?",
        [groupId],
        (currentErr, currentResults) => {
          if (currentErr) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ success: false, error: 'Failed to fetch current members' });
            });
          }

          const currentMemberIds = currentResults.map(row => row.member_id);
          const incomingMemberIds = members || [];
          
          // 2. Calculate ADD and REMOVE
          const toAdd = incomingMemberIds.filter(id => !currentMemberIds.includes(parseInt(id)));
          const toRemove = currentMemberIds.filter(id => !incomingMemberIds.includes(id));

          let queryIndex = 0;
          const queries = [];

          // 3. Update group name/description
          if (name !== undefined || description !== undefined) {
            const updateFields = [];
            const updateValues = [];

            if (name !== undefined) {
              updateFields.push('name = ?');
              updateValues.push(name);
            }
            // if (description !== undefined) {
            //   updateFields.push('description = ?');
            //   updateValues.push(description);
            // }
            updateValues.push(groupId);

            queries.push((cb) => {
              const updateSql = `UPDATE \`groups\` SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
              connection.query(updateSql, updateValues, cb);
            });
          }

          // 4. Add new members
          if (toAdd.length > 0) {
            const addValues = toAdd.map(id => [groupId, parseInt(id)]);
            queries.push((cb) => {
              connection.query('INSERT IGNORE INTO `group_members` (group_id, member_id) VALUES ?', [addValues], cb);
            });
          }

          // 5. Remove missing members
          if (toRemove.length > 0) {
            const removePlaceholders = toRemove.map(() => '?').join(',');
            const removeValues = [groupId, ...toRemove];
            queries.push((cb) => {
              connection.query(
                `DELETE FROM \`group_members\` WHERE group_id = ? AND member_id IN (${removePlaceholders})`,
                removeValues,
                cb
              );
            });
          }

          // 6. Execute all operations
          executeNext(0);

          function executeNext(index) {
            if (index >= queries.length) {
              return commitAndRespond();
            }
            queries[index]((err, result) => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).json({ success: false, error: 'Update operation failed' });
                });
              }
              executeNext(index + 1);
            });
          }

          function commitAndRespond() {
            connection.commit((commitErr) => {
              if (commitErr) {
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).json({ success: false, error: 'Commit failed' });
                });
              }

              // Fetch updated group
              const fetchSql = 
                "SELECT g.*, COUNT(gm.member_id) as member_count " +
                "FROM `groups` g " +
                "LEFT JOIN `group_members` gm ON g.id = gm.group_id " +
                "WHERE g.id = ?";

              connection.query(fetchSql, [groupId], (fetchErr, groupData) => {
                connection.release();
                
                if (fetchErr) {
                  return res.status(500).json({ success: false, error: 'Fetch failed' });
                }

                res.json({
                  success: true,
                  group: groupData[0],
                  changes: {
                    added: toAdd.length,
                    removed: toRemove.length,
                    currentMembers: incomingMemberIds.length
                  }
                });
              });
            });
          }
        }
      );
    });
  });
};

exports.getMembersWithoutGroup = (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Database connection failed' });
    }

    const sql = `
      SELECT 
        m.id,
        m.name,
        m.mobile,
        m.email,
        m.s_type,
        m.district,
        m.subject,
        m.status,
        m.created_at
      FROM members m
      LEFT JOIN \`group_members\` gm ON m.id = gm.member_id
      WHERE gm.member_id IS NULL
      AND m.status = 'Active'
      AND m.type = "teacher"
      AND m.subject != "headmaster"
      ORDER BY m.name ASC
    `;

    connection.query(sql, (err, results) => {
      connection.release();
      
      if (err) {
        console.error('Members fetch error:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch members' });
      }

      res.json({
        success: true,
        count: results.length,
        members: results
      });
    });
  });
};
