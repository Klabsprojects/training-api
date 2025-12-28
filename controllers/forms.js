const connection = require('../db');
const {encrypt} = require('../helpers/helper');
const {sendWHBatch} =require('../helpers/curls');
const ct_tra = require('../controllers/training');

//wrapper function
const callValidateTrainingRequirements = (trainingId, req, callback) => {
    const mockReq = { params: { id: trainingId } };
    const mockRes = {
        status: () => mockRes,  // Chainable mock
        json: (data) => {
            // ✅ SILENT - Capture data, DON'T call real res.json()
            callback(data);
        }
    };
    
    // Call original function - it will use our silent mockRes
    ct_tra.validateTrainingRequirements(mockReq, mockRes);
};

  exports.list = (req, res) => {
    const user = req.user;
    connection.query("SELECT id, type, name, detail, (LENGTH(quests) - LENGTH(REPLACE(quests, ',', '')) + 1) quests, if(LENGTH(participants) = 0, '-',(LENGTH(participants) - LENGTH(REPLACE(participants, ',', '')) + 1)) participants, expire FROM forms WHERE status = 'Active'", (err, results) => {
      if (err) 
          res.status(500).json({ error: err.message });
      else {
          if (results.length === 0) 
              res.status(404).json({error: true, message: 'Form Not Available' });
          else {
                  res.json({error: false, message: 'Forms List', data:results, user});
            }
        }
      });
  };

  exports.create = async (req, res) => {
    let data = req.body;
    const user = req.user;
    data.created_by = user.id;
    connection.query('INSERT INTO forms SET ?', data, (err, results) => {
      if (err) 
        res.status(500).json({ error: err.message, data:data.options });
      else         
        res.json({error: false, message: 'Form Created Successfully', data:results, user});      
    });
  };

  exports.getById = (req, res) => {
    const id = req.params.id;
    const user = req.user;
    connection.query('SELECT * FROM forms WHERE id = ?', [id], (err, results) => {
      if (err) 
        res.status(500).json({ error: err.message });
      else {
        if (results.length === 0) 
          res.status(404).json({error: true, message: 'Data not found for the given ID' });
        else 
          res.json({ error: false, message: 'Form Detail', data: results[0], user});
      }
    });
  };

  exports.update = (req, res) => {  
    console.log(req.header);
    const id = req.params.id;
    const data = req.body;
    const user = req.user;
    let partColumns = [];
    if(data.add_participants){
        partColumns.push("participants = CASE WHEN participants IS NULL OR participants = '' THEN '"+data.add_participants+"' ELSE CONCAT(participants, ',', '"+data.add_participants+"') END");
        const params = {type:'Form', ids:data.add_participants, fid:id, uid:user.id};
        delete data.add_participants;
        sendWHBatch(params);       
    }
    if(data.add_quests){
        partColumns.push("quests = CASE WHEN quests IS NULL OR quests = '' THEN '"+data.add_quests+"' ELSE CONCAT(quests, ',', '"+data.add_quests+"') END");
        delete data.add_quests;
    }
    let uQry = `UPDATE forms SET ${partColumns.length ? partColumns.join(', ') : ''} WHERE id = ?`;
    let Qry = [id];
    if(data.type){
      uQry = `UPDATE forms SET ${partColumns.length ? partColumns.join(', ')+',' : ''} ? WHERE id = ?`;
      Qry = [data, id];
    }
    // res.status(500).json({ error: false, uQry, len:data});
    connection.query(uQry, Qry, (err) => {
    if (err) 
        res.status(500).json({ error: err.message, uQry});
     else {
            // Send IMMEDIATE response - ONLY form update info
            res.json({ 
                error: false, 
                message: 'Form Updated', 
                user 
            });
            
            // BACKGROUND PROCESS - Silent, no response impact
            connection.query('SELECT ref FROM forms WHERE id = ?', [id], (selectErr, selectResults) => {
                if (selectErr) {
                    console.error('Background ref fetch failed:', selectErr);
                    return;
                }
                
                const ref = selectResults.length > 0 ? selectResults[0].ref : null;
                console.log('Background check - Fetched ref:', ref);
                
                // Background validation check
                callValidateTrainingRequirements(ref, req, (validationResult) => {
                    if (validationResult.error === false && 
                        validationResult.computedCompletionStatus === 'completed') {
                        
                        console.log('Background: Training status is completed');
                        // Background status update - SILENT
                        ct_tra.updateTrainingStatusToCompleted(validationResult.trainingId, (statusResult) => {
                            if (statusResult.error === false) {
                                console.log('Background: Training completed updated successfully');
                            } else {
                                console.error('Background: Training status update failed:', statusResult);
                            }
                        });
                    } else {
                        console.log('Background: Training still pending');
                    }
                });
            });
        }
    });
};

  exports.getparts = (req, res) => {
    const id = req.params.id;
    const user = req.user;
    qry = `SELECT id, type, name, staff_id, mobile, district, subject FROM members WHERE find_in_set(id, (SELECT replace(participants, ' ','') FROM forms WHERE id = ?))`;
    connection.query(qry, [id], (err, results) => {
      if (err) 
        res.status(500).json({ error: err.message });
      else {
        if (results.length === 0) 
          res.status(404).json({error: true, message: 'No Participants added' });
        else {
          results = results.map(result => {
            Pid = result.id;
            result.link =  "https://mem.masclass.in/"+encrypt(id.toString().padStart(4, '0')+'1'+Pid.toString().padStart(4, '0'));
            return result;
          });
          res.json({ error: false, message: 'Form Participants Detail', data: results, user});
        }
      }
    });
  };
  
  exports.getFrmSts = (req, res) => {
    const user = req.user;
    const id = req.params.id;
    qry = `SELECT id, type, (SELECT GROUP_CONCAT('{"date":"',created_at,'","id":', receiver, '}') FROM requests WHERE type = 'Form' AND ref = '101' AND FIND_IN_SET(receiver, replace(participants,' ',''))) sent, (SELECT GROUP_CONCAT('{"id":', created_by,',"response":',response, '}') FROM responses WHERE type = 'Feedback' AND ref = '101' AND FIND_IN_SET(created_by, replace(participants,' ',''))) received FROM forms WHERE id = ?`; 
    connection.query(qry, id, (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({error: true, message: 'No Participants added' });
      results.forEach(row => {
        if(row.sent)
          row.sent = JSON.parse('['+row.sent+']');
        if(row.received)
          row.received = JSON.parse('['+row.received+']');
        });
       
      res.json({ error: false, message: 'Form Sent Received Detail', data: results, user}); 
    });
  }
