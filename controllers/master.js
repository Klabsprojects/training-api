const connection = require('../db');
const util = require('util');

  exports.tlist = (req, res) => {
    const user = req.user;
    connection.query("SELECT id, name, detail FROM master WHERE type = 'Training' AND status = 'Active'", (err, results) => {
      if (err) 
          res.status(500).json({ error: err.message });
      else {
          if (results.length === 0) 
              res.status(404).json({error: true, message: 'Training detail Available' });
          else {
              // res.json({error: false, message: 'Training detail List', data:results, user});
              const data = results.map(result => {return {...result, detail: JSON.parse(result.detail)}});
              res.json({error: false, message: 'Training detail List', data, user});
            }
        }
      });
  };

  exports.tcreate = async (req, res) => {
    let data = req.body;
    const user = req.user;
    data.detail = JSON.stringify(data.detail);
    data.type = "Training";
    data.created_by = user.id;
    connection.query('INSERT INTO master SET ?', data, (err, results) => {
      if (err) 
        res.status(500).json({ error: err.message, data:data });
      else         
        res.json({error: false, message: 'Training Created Successfully', data:results, user});      
    });
  };

  exports.tgetById = (req, res) => {
    const id = req.params.id;
    const user = req.user;
    connection.query("SELECT id, name, detail FROM master WHERE type = 'Training' AND id = ?", [id], (err, results) => {
      if (err) 
        res.status(500).json({ error: err.message });
      else {
        if (results.length === 0) 
          res.status(404).json({error: true, message: 'Data not found for the given ID' });
        else 
          res.json({ error: false, message: 'Training Detail', data: results[0], user});
      }
    });
  };

  exports.tupdate = (req, res) => {  
    const id = req.params.id;
    const data = req.body;    
    if(data.detail)
      data.detail = JSON.stringify(data.detail);
    const user = req.user;
    uQry = `UPDATE master SET ? WHERE id = ?`;
    Qry = [data, id];
    connection.query(uQry, Qry, (err) => {
    if (err) 
        res.status(500).json({ error: err.message, uQry});
    else 
        res.json({error: false, message: 'Training Updated', user});
    });
  }; 

  exports.llist = (req, res) => {
    const user = req.user;
    connection.query("SELECT id, name, detail FROM master WHERE type = 'Location' AND status = 'Active'", (err, results) => {
      if (err) 
          res.status(500).json({ error: err.message });
      else {
          if (results.length === 0) 
              res.status(404).json({error: true, message: 'Training detail Available' });
          else {
              const data = results.map(result => {return {...result, detail: JSON.parse(result.detail)}});
              res.json({error: false, message: 'Training detail List', data, user});
            }
        }
      });
  };

  exports.lcreate = async (req, res) => {
    let data = req.body;
    const user = req.user;
    data.detail = JSON.stringify(data.detail);
    data.created_by = user.id;
    data.type = "Location";
    connection.query('INSERT INTO master SET ?', data, (err, results) => {
      if (err) 
        res.status(500).json({ error: err.message, data:data });
      else         
        res.json({error: false, message: 'Location Created Successfully', data:results, user});      
    });
  };

  exports.lgetById = (req, res) => {
    const id = req.params.id;
    const user = req.user;
    connection.query("SELECT id, name, detail FROM master WHERE type = 'Location' AND id = ?", [id], (err, results) => {
      if (err) 
        res.status(500).json({ error: err.message });
      else {
        if (results.length === 0) 
          res.status(404).json({error: true, message: 'Data not found for the given ID' });
        else 
          res.json({ error: false, message: 'Training Detail', data: results[0], user});
      }
    });
  };

  exports.lupdate = (req, res) => {
    const user = req.user;
    const id = req.params.id;
    const data = req.body; 
    if(data.detail)   
      data.detail = JSON.stringify(data.detail);
    uQry = `UPDATE master SET ? WHERE id = ?`;
    Qry = [data, id];
    connection.query(uQry, Qry, (err) => {
    if (err) 
        res.status(500).json({ error: err.message, uQry});
    else 
        res.json({error: false, message: 'Training Updated', user});
    });
  };
  
  exports.alist = (req, res) => {
    const user = req.user;
    const id = req.params.id;
    let sqlKeys = []; sqlKeys.where = [`status = 'Active'`, `type = 'stay'`];

    if(id) sqlKeys.where.push(`id = ${id}`);
    connection.query(`SELECT id, name, detail FROM master WHERE  ${sqlKeys.where.join(' AND ')}`, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({error: true, message: 'Training detail Available' });
      let data = results.map(result => {
        const detail = JSON.parse(result.detail || '{}'); 
        const { detail: _, ...rest } = result; 
        return {...rest, ...detail}
      });
      if(id) data = data[0];
      res.json({error: false, message: 'Accomdation detail List', data, user});
    });
  };

  exports.acreate = async (req, res) => {
    let data = req.body;
    const user = req.user;
    const {name, ...detail } = req.body;
    const iData = {type:"stay", name, detail:JSON.stringify(detail), created_by: user.id};
    connection.query('INSERT INTO master SET ?', iData, (err, results) => {
      if (err) return res.status(500).json({ error: err.message, data:data });
      res.json({error: false, message: 'Accomdation Created Successfully', data:results, user});      
    });
  };

  exports.aupdate = (req, res) => {
    const user = req.user;
    const id = req.params.id;    
    const {name, status, ...detail } = req.body;
    let iData = {};
    if(name) iData.name = name;
    if(Object.keys(detail).length  > 0) iData.detail = JSON.stringify(detail);
    if(status) iData.status = status;
    
    connection.query(`UPDATE master SET ? WHERE id = ?`, [iData, id], (err) => {
      if (err) return res.status(500).json({ error: err.message, uQry});
      
      res.json({error: false, message: 'Accomdation Updated', user});
    });
  };

  exports.getList = (req, res) => {
    const user = req.user;                 
    const { type, id } = req.params;
    
    let sql = []; sql.where = [`status = 'Active'`, `type = ?`]; sql.val = [type];
    
    connection.query(`SELECT id, name, detail FROM master WHERE ${sql.where.join(' AND ')} ORDER BY id`, sql.val, (err, results) => {
        if (err) return res.status(500).json({ error: err });

        console.log('RAW DB RESULTS:', util.inspect(results, { depth: null }));
        let data = results.map(record => {
          const detail = JSON.parse(record.detail || '{}'); 
          const { detail: _, ...rest } = record;
          return { ...rest, ...detail };
        });
        if(type == 'CheckList') data = buildHierarchy(data);
        return res.json({error: false, message: `${type} List`, data, user});
    });
};

function buildHierarchy(rows) {
  //console.log('rows => ', rows);
  // Create a map for quick lookup
  const map = {};
  rows.forEach(r => {
    map[r.id] = { ...r, sub: [] };
  });
//console.log('map => ', map);
  const tree = [];
//console.log('tree intial ', tree);
  rows.forEach(r => {
    if (r.p_id) {
      // Find parent and attach as child
      const parent = map[r.p_id];
      if (parent) {
        parent.sub.push(map[r.id]);
      }
    } else {
      // This is a root-level node
      tree.push(map[r.id]);
      //console.log(' tree next =>', tree);
      //console.log(' tree next =>', util.inspect(tree, { depth: null, colors: true }));
    }
  });

  return tree;
}

//CheckList master api's

//Create
exports.createChecklist = (req, res) => {
    const user = req.user;
    const { trainingType, trainingMode, checklistArray } = req.body;
    
    const topLevelName = `Checklist for ${trainingType} (${trainingMode})`;
    const type = 'CheckList'; // Assuming 'CheckList' is used for the master record
 
    // --- STEP 1: DUPLICATION CHECK ---
    const checkQuery = `SELECT id FROM master 
                        WHERE trainingType = ? AND trainingMode = ? AND type = ? AND status = 'Active'`;
    const checkValues = [trainingType, trainingMode, type];

    connection.query(checkQuery, checkValues, (checkErr, checkResults) => {
        if (checkErr) {
            console.error("Duplication check failed:", checkErr);
            return res.status(500).json({ error: 'Database check error.' });
        }

        if (checkResults.length > 0) {
            // A matching checklist already exists. BLOCK creation.
            return res.status(409).json({ // 409 Conflict is the appropriate status
                error: true, 
                message: `A checklist already exists for Training Type: '${trainingType}' and Training Mode: '${trainingMode}'.`
            });
        }

        // --- Duplication Check Passed: Proceed with Insertion ---

        const masterQuery = `INSERT INTO master 
                             (type, name, trainingType, trainingMode, status, created_by, detail) 
                             VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const masterValues = [
            type, 
            topLevelName, 
            trainingType, 
            trainingMode, 
            'Active', 
            user.id || 0,
            JSON.stringify({ checklistArray }),
        ];

        // STEP 2: Get a dedicated connection (conn) from the pool (connection)
        connection.getConnection((connErr, conn) => {
            if (connErr) {
                return res.status(500).json({ error: 'Failed to get connection from pool: ' + connErr.message });
            }
            // console.log('connection pool success');

            // STEP 3: Start the transaction on the DEDICATED connection (conn)
            conn.beginTransaction(transactionErr => {
                if (transactionErr) {
                    conn.release(); 
                    return res.status(500).json({ error: 'Failed to start transaction: ' + transactionErr.message });
                }
                
                // console.log('transaction begin success');

                // STEP 4: Insert the master record
                conn.query(masterQuery, masterValues, (masterErr, masterResult) => {
                    if (masterErr) {
                        return conn.rollback(() => {
                            conn.release(); 
                            res.status(500).json({ error: 'Master insert failed: ' + masterErr });
                        });
                    }
                    
                    const masterId = masterResult.insertId;

                    // STEP 5: Start recursive insertion
                    insertChecklistItems(conn, checklistArray, masterId, user.id || 0)
                        .then(() => {
                            // Commit logic...
                            conn.commit(commitErr => {
                                conn.release();
                                if (commitErr) { 
                                    return conn.rollback(() => res.status(500).json({ error: 'Transaction commit failed: ' + commitErr }));
                                }
                                res.json({ error: false, message: 'Checklist and items created successfully', masterId: masterId });
                            });
                        })
                        .catch(insertErr => {
                            // Rollback and release on failure
                            conn.rollback(() => {
                                conn.release();
                                res.status(500).json({ error: 'Item insertion failed: ' + insertErr });
                            });
                        });
                });
            });
        });
    });
};

function insertChecklistItems(conn, items, parentId, userId) {
    if (!items || items.length === 0) {
        return Promise.resolve();
    }

    const insertPromises = items.map(item => {
        return new Promise((resolve, reject) => {
            // MODIFICATION: Removed p_id column from the INSERT fields
            const itemQuery = `INSERT INTO master 
                               (type, name, status, created_by, detail) 
                               VALUES (?, ?, ?, ?, ?)`;
            
            // CRITICAL: detailJson now holds the p_id for hierarchy lookup later
            const detailJson = JSON.stringify({ p_id: parentId }); 
            
            const itemValues = [
                'CheckList', 
                item.name, 
                'Active', 
                userId, // Pass the user ID for created_by
                detailJson // This is the {"p_id":XXX} string
            ];

            // Use 'conn.query'
            conn.query(itemQuery, itemValues, (err, result) => {
                if (err) return reject(err);

                const newItemId = result.insertId;
                
                // Pass 'conn' and the user ID in the recursive call
                insertChecklistItems(conn, item.sub, newItemId, userId) 
                    .then(resolve) 
                    .catch(reject); 
            });
        });
    });

    return Promise.all(insertPromises);
}

//Get
exports.getChecklist = (req, res) => {
    // 1. Fetch ALL Master Checklist records (The top-level root items)
    // Filters: type='CheckList', has trainingType/trainingMode set, status='Active'
    const masterQuery = `SELECT id, name, trainingType, trainingMode 
                         FROM master 
                         WHERE type = 'CheckList' AND trainingType IS NOT NULL AND status = 'Active'`;

    connection.query(masterQuery, (err, masterResults) => {
        if (err) {
            console.error('Database error fetching master checklists:', err);
            return res.status(500).json({ error: true, message: 'Database error fetching master lists.' });
        }
        
        if (masterResults.length === 0) {
            return res.json({ error: false, message: 'No Master Checklists found.', data: [] });
        }
        
        // 2. Fetch ALL CheckList Items (The nested child elements)
        // Filters: type='CheckList', trainingType/trainingMode is NULL, status='Active'
        const allItemsQuery = `SELECT id, name, detail, status 
                               FROM master 
                               WHERE type = 'CheckList' AND trainingType IS NULL AND status = 'Active'
                               ORDER BY id`;

        connection.query(allItemsQuery, (err, allItemsResults) => {
            if (err) {
                console.error('Database error fetching all checklist items:', err);
                return res.status(500).json({ error: true, message: 'Database error fetching checklist items.' });
            }
            
            // 3. Prepare data and create the initial map structure
            // Parse JSON from the 'detail' column to get the 'p_id'
            let allItemData = allItemsResults.map(record => {
                try {
                    const detail = JSON.parse(record.detail || '{}'); 
                    const { detail: _, ...rest } = record;
                    // Ensure the resulting object includes {id, name, p_id, sub:[]}
                    return { ...rest, ...detail, sub: [] }; 
                } catch (e) {
                    console.warn(`Skipping item ID ${record.id} due to JSON parsing error:`, e);
                    return null; // Skip invalid records
                }
            }).filter(item => item !== null);

            // Create a global map of items for O(1) lookup
            const itemMap = {};
            allItemData.forEach(r => {
                // Use the data structure we prepared, including the empty 'sub' array
                itemMap[r.id] = r;
            });

            // 4. LINK ALL items to their respective parents ONCE.
            // This builds the complete nested structure in the global itemMap.
            allItemData.forEach(r => {
                // If it has a parent ID (p_id) and that parent exists in the map
                if (r.p_id && itemMap[r.p_id]) { 
                    const parent = itemMap[r.p_id];
                    // Append the current item object to the parent's sub array
                    parent.sub.push(r);
                }
            });
            
            // 5. Build the Final List of Hierarchies
            const finalChecklistArray = masterResults.map(masterRecord => {
                
                // Identify the absolute root items for this specific master record (ID 179, 187, 195...)
                const targetRoots = [];

                // Find items whose direct parent is the current master record ID
                allItemData.forEach(r => {
                    if (r.p_id === masterRecord.id) {
                        // Push the item (which already contains its full nested 'sub' hierarchy)
                        targetRoots.push(r); 
                    }
                });

                // Return the complete structure for the current master
                return {
                    id: masterRecord.id,
                    name: masterRecord.name,
                    trainingType: masterRecord.trainingType,
                    trainingMode: masterRecord.trainingMode,
                    hierarchy: targetRoots // The correct, single nested array
                };
            });
            
            // 6. Send the final response
            return res.json({ 
                error: false, 
                message: `Found ${finalChecklistArray.length} total checklists.`, 
                data: finalChecklistArray
            });
        });
    });
};

//Update 
exports.updateChecklist = (req, res) => {
    const user = req.user;
    const { masterId, checklistArray } = req.body;
    
    // Simple validation
    if (!masterId || !checklistArray) {
        return res.status(400).json({ error: true, message: 'Missing masterId or checklistArray in request body.' });
    }

    // STEP 1: Get a dedicated connection (conn) from the pool (connection)
    connection.getConnection((connErr, conn) => {
        if (connErr) {
            return res.status(500).json({ error: 'Failed to get connection from pool: ' + connErr.message });
        }

        // STEP 2: Start the transaction on the DEDICATED connection (conn)
        conn.beginTransaction(async (transactionErr) => {
            if (transactionErr) {
                conn.release(); 
                return res.status(500).json({ error: 'Failed to start transaction: ' + transactionErr.message });
            }
            
            try {
                // STEP 3: Fetch the current hierarchy structure for this masterId
                const currentItems = await fetchCurrentHierarchy(conn, masterId);
                const currentItemIds = currentItems.map(item => item.id);
                
                // STEP 4: Perform the recursive update/insert logic
                const allNewIds = []; // To collect all IDs in the new structure
                
                await updateChecklistItems(
                    conn, 
                    checklistArray, 
                    masterId, // The master ID acts as the top-level p_id
                    user.id || 0,
                    allNewIds // Pass the array to collect all new/updated item IDs
                );
                
                // STEP 5: Identify and logically delete (set status='Inactive') old items
                // This prevents deletion of the master record itself (masterId)
                const itemsToDelete = currentItemIds.filter(id => !allNewIds.includes(id) && id !== masterId);

                if (itemsToDelete.length > 0) {
                    const deleteQuery = `UPDATE master SET status = 'Inactive', updated_at = NOW() WHERE id IN (?)`;
                    await new Promise((resolve, reject) => {
                        conn.query(deleteQuery, [itemsToDelete], (delErr, delResult) => {
                            if (delErr) return reject(delErr);
                            resolve(delResult);
                        });
                    });
                }

                // STEP 6: Commit and respond
                conn.commit(commitErr => {
                    conn.release();
                    if (commitErr) { 
                        return conn.rollback(() => res.status(500).json({ error: 'Transaction commit failed: ' + commitErr }));
                    }
                    res.json({ error: false, message: 'Checklist hierarchy updated successfully.', masterId: masterId });
                });
                
            } catch (updateErr) {
                // Rollback and release on failure
                conn.rollback(() => {
                    conn.release();
                    res.status(500).json({ error: 'Checklist update failed: ' + updateErr.message });
                });
            }
        });
    });
};

// Helper to get ALL existing child IDs for soft deletion
function fetchCurrentHierarchy(conn, masterId) {
    return new Promise((resolve, reject) => {
        // Query ALL items where the masterId is the ultimate parent (recursively)
        // Since p_id is stored in the JSON detail, we must use a LIKE search
        const query = `
            SELECT id 
            FROM master 
            WHERE type = 'CheckList' 
            AND status = 'Active' 
            AND (detail LIKE '%"p_id":${masterId}%' OR id = ?)
        `;
        
        conn.query(query, [masterId], (err, results) => {
            if (err) return reject(err);
            
            // To be safe, we also include the masterId itself, though it shouldn't be deleted.
            const itemIds = results.map(row => row.id);
            // Deduplicate and ensure the masterId is present
            const uniqueIds = Array.from(new Set([masterId, ...itemIds]));

            // We return a list of objects {id: X} for consistency, filtering out the masterId later in the controller
            resolve(results); 
        });
    });
}

// Helper to recursively update or insert checklist items
async function updateChecklistItems(conn, items, parentId, userId, allNewIds) {
    if (!items || items.length === 0) {
        return Promise.resolve();
    }
    
    // Using a for...of loop to manage async/await for sequential operations
    for (const item of items) {
        let currentItemId = item.id;
        
        // CRITICAL: The detailJson MUST always include the current parentId (p_id)
        const detailJson = JSON.stringify({ p_id: parentId }); 
        
        if (item.id) {
            // --- UPDATE EXISTING ITEM ---
            const updateQuery = `UPDATE master SET name = ?, detail = ?, updated_at = NOW() WHERE id = ?`;
            const updateValues = [item.name, detailJson, item.id];

            await new Promise((resolve, reject) => {
                conn.query(updateQuery, updateValues, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });
            
            allNewIds.push(item.id); // Track this existing ID
            
        } else {
            // --- INSERT NEW ITEM ---
            const insertQuery = `INSERT INTO master (type, name, status, created_by, detail) VALUES (?, ?, ?, ?, ?)`;
            const insertValues = ['CheckList', item.name, 'Active', userId, detailJson];

            const insertResult = await new Promise((resolve, reject) => {
                conn.query(insertQuery, insertValues, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });
            
            currentItemId = insertResult.insertId;
            allNewIds.push(currentItemId); // Track the newly inserted ID
        }
        const subItems = item.sub || [];
        // RECURSIVE CALL for sub-items
        if (subItems.length > 0) {
            await updateChecklistItems(conn, subItems, currentItemId, userId, allNewIds);
        }
    }
}


//Get by id
exports.getChecklistById = (req, res) => {
    // Get the specific master ID (root of the tree) from the URL parameters
    const rootId = req.params.rootId;
    
    if (!rootId) {
        return res.status(400).json({ error: true, message: 'Missing rootId in request.' });
    }

    // 1. Fetch the specific Master Checklist record (The top-level root item)
    const masterQuery = `SELECT id, name, trainingType, trainingMode 
                         FROM master 
                         WHERE id = ? AND type = 'CheckList' AND status = 'Active'`;

    connection.query(masterQuery, [rootId], (err, masterResults) => {
        if (err) {
            console.error('Database error fetching master checklist:', err);
            return res.status(500).json({ error: true, message: 'Database error fetching master list.' });
        }
        
        if (masterResults.length === 0) {
            return res.status(404).json({ error: false, message: 'Master Checklist not found or is inactive.', data: null });
        }
        
        const masterRecord = masterResults[0];

        // 2. Fetch ALL CheckList Items related to this root (The nested child elements)
        // We fetch all active CheckList items, regardless of their trainingType/Mode, 
        // to ensure we capture the entire nested hierarchy.
        const allItemsQuery = `SELECT id, name, detail, status 
                                 FROM master 
                                 WHERE type = 'CheckList' AND status = 'Active' 
                                 ORDER BY id`;

        connection.query(allItemsQuery, (err, allItemsResults) => {
            if (err) {
                console.error('Database error fetching all checklist items:', err);
                return res.status(500).json({ error: true, message: 'Database error fetching checklist items.' });
            }
            
            // 3. Prepare data and create the initial map structure
            let allItemData = allItemsResults.map(record => {
                try {
                    const detail = JSON.parse(record.detail || '{}'); 
                    // Remove the 'detail' field from the final output object
                    const { detail: _, ...rest } = record; 
                    // Add p_id from the parsed JSON and an empty 'sub' array
                    return { ...rest, ...detail, sub: [] }; 
                } catch (e) {
                    console.warn(`Skipping item ID ${record.id} due to JSON parsing error:`, e);
                    return null;
                }
            }).filter(item => item !== null);

            // Create a global map of items for O(1) lookup
            const itemMap = {};
            allItemData.forEach(r => {
                itemMap[r.id] = r;
            });

            // 4. LINK ALL items to their respective parents ONCE.
            allItemData.forEach(r => {
                // Link child to parent in the map structure
                if (r.p_id && itemMap[r.p_id]) { 
                    const parent = itemMap[r.p_id];
                    parent.sub.push(r);
                }
            });
            
            // 5. Build the Final Hierarchy for the specific root ID
            const targetRoots = [];

            // Find items whose direct parent is the specific root ID requested
            allItemData.forEach(r => {
                if (r.p_id === masterRecord.id) {
                    // This item object already contains its full nested 'sub' hierarchy due to Step 4
                    targetRoots.push(r); 
                }
            });

            // 6. Send the final response
            const finalChecklist = {
                id: masterRecord.id,
                name: masterRecord.name,
                trainingType: masterRecord.trainingType,
                trainingMode: masterRecord.trainingMode,
                hierarchy: targetRoots // The complete nested structure
            };
            
            return res.json({ 
                error: false, 
                message: `Checklist hierarchy retrieved for ID ${rootId}.`, 
                data: finalChecklist
            });
        });
    });
};
