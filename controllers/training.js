
const connection = require('../db');
const {createSessions, customDate, encrypt} = require('../helpers/helper');
const {sendGetRequest, sendBatchTraining, sendTrainermsg, sendObsInv, sendWHBatch} =require('../helpers/curls');


function normalizeJsonField(rawValue, mapper = (x) => x) {
  try {
    if (!rawValue) return [];

    // If it's already an array, use it directly
    const parsed = Array.isArray(rawValue)
      ? rawValue
      : JSON.parse(rawValue);

    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => mapper(item || {}));
  } catch (err) {
    // Never throw – always return safe empty array
    return [];
  }
}

  // Specific normalizer for checklist_assignments_info
  function normalizeChecklistAssignments(rawChecklistAssignmentsInfo) {
    return normalizeJsonField(rawChecklistAssignmentsInfo, (item) => ({
      rootId: item.rootId ?? null,
      parentId: item.parentId ?? null,
      itemId: item.itemId ?? null,
      memberId: item.memberId ?? null,
      assignDate: item.assignDate ?? null,
      status: item.status ?? null,
      info: item.info ?? null,
      historyOrder: item.historyOrder ?? null,
      comments: item.comments ?? null,
      startDate: item.startDate ?? null,
      endDate: item.endDate ?? null,
      // reassignDate: item.reassignDate ?? null,
      // reassigned: item.reassigned ?? null,
    }));
  }


  exports.list = (req, res) => {
    const user = req.user;
    const status = req.query.status;
    const type = req.query.type;
    let whereClauses = [];
    let orderColumns = ["id desc"];

    if (status && status == 'Upcoming'){
      whereClauses = ["t_start > now()"];
      orderColumns = ["t_start"];
    }
    if (status && status == 'Ongoing'){
      whereClauses = ["CURDATE() BETWEEN t_start AND t_end"];
      orderColumns = ["t_start"];
    }
    if (status && status == 'Completed')
      whereClauses = ["t_end < CURDATE()"];
    if (type)
      whereClauses = ["type = '"+type+"'"];
    if (user['role'] == 'Trainer') 
      whereClauses.push("find_in_set("+user.id+", trainers)");
    if (user['role'] == 'Support') 
      whereClauses.push("find_in_set("+user.id+", associates)");
    if (user.role == 'Team')      
      whereClauses.push(`created_by = ${user.id}`);

    qry = `SELECT id, type, name, detail, t_start, t_end, (LENGTH(trainers) - LENGTH(REPLACE(trainers, ',', '')) + 1) trainees, (LENGTH(participants) - LENGTH(REPLACE(participants, ',', '')) + 1) participants, locations, images FROM trainings WHERE status = 'Active'  ${whereClauses.length ? 'AND ' + whereClauses.join(' AND ') : ''} ORDER BY ${orderColumns.join(', ')}`;
    connection.query(qry, (err, results) => {
      if (err) 
          res.status(500).json({ error: err.message });
      else {
          if (results.length === 0) 
              res.status(404).json({error: true, message: 'Training Not Available' });
          else {
            results.forEach((row) => {
              if (row.locations) {                
                row.school = JSON.parse(row.school || '{}');
                row.s_type = JSON.parse(row.s_type || '{}');
                row.images = JSON.parse(row.images || '[]');
                try {              
                  row.subject = JSON.parse(row.subject || '{}');
                  const locationArray = JSON.parse(row.locations);
                  if (Array.isArray(locationArray)) 
                    row.locations = locationArray.map(item => item.place+' -'+item.name || '').join(', ');
                   else 
                    row.locations = ''; // Fallback if locations isn't an array
                  
                } catch (error) {
                  console.error('Error parsing row:', error);
                  row.locations = ''; // Set empty string on error
                }
              } else {
                row.locations = ''; // Set empty if locations field doesn't exist
              }
            });
            
            res.json({error: false, message: 'Training List', data:results, user});
          }
        }
    });
  };

  exports.createold1 = async (req, res) => {
    let data = req.body;
    const user = req.user;
    data.created_by = user.id;
    const{subject, s_type} = data;
    if (data.school) 
      data.school = JSON.stringify(data.school);
    if (data.s_type) 
      data.s_type = JSON.stringify(data.s_type);
    if (data.subject) 
      data.subject = JSON.stringify(data.subject);
    if (data.locations) {
      let trainers = [];
      let associates = [];
      const loc = data.locations;
      loc.forEach(location => {
        trainers = trainers.concat(location.trainer || []);
        associates = associates.concat(location.associate || []);
      });
      data.trainers = trainers.join(',');
      data.associates = associates.join(',');      
      data.sessions = JSON.stringify(data.sessions);
      data.locations = JSON.stringify(data.locations);
    }
    // res.status(500).json({ error: 'Check', subject, stype});    
    connection.query(`SELECT group_concat(id) ids FROM members WHERE status = 'Active' AND subject in (?) AND s_type in (?)`, [subject, s_type],(err, results) => {
      if (err) {
        res.status(500).json({ error: err.message, data:data });
      } else {
        data.participants = results[0].ids;
        connection.query('INSERT INTO trainings SET ?', data, (err, results) => {
          if (err) {
            res.status(500).json({ error: err.message, data:data });
          } else {
            // const params = "TNMSC conducting "+data.name+"Scheduled on "+data.t_start+",\n Need to register in https://mem.masclass.in/bbextbbbg";
            // sendTraining(params, nums, (err, response) => {if (err) { return res.status(500).json({ error: true, message: 'Failed to fetch message', details: err.message });}});
                        
            res.json({error: false, message: 'Training Created Successfully', data:results, user});
          }        
        });
      }
    });
  };

  exports.sendmessage = (req, res) => {    
    const tid = req.params.id;
    const ids = req.body.participants;    
    const user = req.user;

    qry = `SELECT id, type, name, detail, t_start, t_end, JSON_UNQUOTE(JSON_EXTRACT(locations, '$[0].link')) location FROM trainings WHERE status = 'Active' AND id = ? `;
    connection.query(qry, [tid], (err, data) => {
      if (err) 
        res.status(500).json({ error: err.message });
      else {
        const params = {ids, tid, tname: data[0].name, typ: data[0].type, detail: data[0].detail, cdate: customDate(data[0].t_start)+' to '+customDate(data[0].t_end), location: data[0].location, uid:user.id};
        sendBatchTraining(params, (err, results) => { if (err) console.error('Error sending messages:', err.message); else console.log('Messages sent successfully:', results);});
        res.json({error: false, message: 'Trainee Invite proccesed'});
      }
    });
  }

  exports.sendTmessage = (req, res) => {    
    const tid = req.params.id;
    const id = req.body.id;    
    const user = req.user;
    
    qry = `SELECT type, name, detail, t_start, t_end, JSON_UNQUOTE(JSON_EXTRACT(locations, '$[0].link')) location FROM trainings WHERE status = 'Active' AND id = ? `;
    connection.query(qry, [tid], (err, data) => {
      if (err) {
        // 1. Handle database error (500)
        return res.status(500).json({ error: err.message });
      }

      // --- 2. Check if the training was found ---
      if (!data || data.length === 0) {
        // If no training is found with the given ID and 'Active' status
        return res.status(404).json({ 
          error: true, 
          message: 'Active training not found for the given ID.' 
        });
      }
      
      //data[0] is guaranteed to exist
      const training = data[0]; 

      const params = {
        id, 
        tid, 
        tname: training.name, // Access properties on the safe 'training' object
        typ: training.type, 
        detail: training.detail, 
        cdate: customDate(training.t_start) + ' to ' + customDate(training.t_end), 
        location: training.location, 
        uid: user.id
      };
      
      console.log('params ', params);
      sendTrainermsg(params, (err, results) => { if (err) console.error('Error sending messages:', err.message); else console.log('Messages sent successfully:', results);});
      
      // Return success response
      res.json({ error: false, message: 'Trainer Invite processed' });
    });
  }

  exports.sendTraMat = (req, res) => {    
    const fid = req.params.id;
    const ids = req.body.ids;    
    const user = req.user;
    
    const params = {type:'Material', ids, fid, uid:user.id};
    sendWHBatch(params);
    res.json({error: false, message: 'Training Materials proccesed'});
  }

  exports.getById = (req, res) => {
    const id = req.params.id;
    const user = req.user;
    // const selectColumns = ["(LENGTH(participants) - LENGTH(REPLACE(participants, ',', '')) + 1) invited", "(LENGTH(observers) - LENGTH(REPLACE(observers, ',', '')) + 1) observer", "observers"];
    // selectColumns.push("(SELECT group_concat(distinct JSON_UNQUOTE(JSON_EXTRACT(response, '$.session'))) FROM responses WHERE type = 'attendance' AND ref = trainings.id) att");
    // selectColumns.push("(SELECT count(distinct created_by) FROM responses WHERE type = 'RSVP' AND ref = trainings.id) rsvp");
    // selectColumns.push(`(SELECT group_concat(id, ":-", JSON_UNQUOTE(JSON_VALUE(response, '$.name')), ":-", JSON_UNQUOTE(JSON_EXTRACT(response, '$.data')), ':-',(SELECT name FROM users WHERE id = responses.created_by) SEPARATOR "->") FROM responses WHERE type = 'Materials' AND ref = trainings.id) mdata`);
    // selectColumns.push(`ifnull((SELECT JSON_LENGTH(REPLACE(JSON_EXTRACT(response, '$.score'), '}{', '}, {')) FROM responses WHERE type = 'Pre-Asst' AND ref = trainings.id order by id desc limit 1),0) preasst`);
    // selectColumns.push(`ifnull((SELECT JSON_LENGTH(REPLACE(JSON_EXTRACT(response, '$.score'), '}{', '}, {')) FROM responses WHERE type = 'Post-Asst' AND ref = trainings.id order by id desc limit 1),0) postasst`);
    // selectColumns.push(`(SELECT group_concat(id, ":", name, ":", mobile SEPARATOR "->") FROM users WHERE role = "Trainer" AND find_in_set(id,trainers)) t_data`);
    // selectColumns.push(`(SELECT group_concat(id, ":", name, ":", mobile SEPARATOR "->") FROM users WHERE role = "Support" AND find_in_set(id,associates)) a_data`);
    // selectColumns.push(`if(type = 'ACADEMIC TRAINING' AND t_end < now(), true, false) certificate`);

      const selectColumns = [
          "(LENGTH(participants) - LENGTH(REPLACE(participants, ',', '')) + 1) invited",
          "(LENGTH(observers) - LENGTH(REPLACE(observers, ',', '')) + 1) observer",
          "observers"
        ];

        selectColumns.push(
          "(SELECT GROUP_CONCAT(DISTINCT " +
            "CAST(JSON_UNQUOTE(JSON_EXTRACT(response, '$.session')) AS CHAR CHARACTER SET utf8mb4) " +
          ") FROM responses WHERE type = 'attendance' AND ref = trainings.id) att"
        );

        selectColumns.push(
          "(SELECT COUNT(DISTINCT created_by) FROM responses WHERE type = 'RSVP' AND ref = trainings.id) rsvp"
        );

        selectColumns.push(
          "(SELECT GROUP_CONCAT(" +
            "CAST(id AS CHAR CHARACTER SET utf8mb4), ':-', " +
            "CAST(JSON_UNQUOTE(JSON_VALUE(response, '$.name')) AS CHAR CHARACTER SET utf8mb4), ':-', " +
            "CAST(JSON_UNQUOTE(JSON_EXTRACT(response, '$.data')) AS CHAR CHARACTER SET utf8mb4), ':-', " +
            "(SELECT CAST(name AS CHAR CHARACTER SET utf8mb4) FROM users WHERE id = responses.created_by) " +
            "SEPARATOR '->') " +
          "FROM responses WHERE type = 'Materials' AND ref = trainings.id) mdata"
        );

        selectColumns.push(
          "IFNULL((SELECT JSON_LENGTH(REPLACE(JSON_EXTRACT(response, '$.score'), '}{', '}, {')) " +
          "FROM responses WHERE type = 'Pre-Asst' AND ref = trainings.id ORDER BY id DESC LIMIT 1), 0) preasst"
        );

        selectColumns.push(
          "IFNULL((SELECT JSON_LENGTH(REPLACE(JSON_EXTRACT(response, '$.score'), '}{', '}, {')) " +
          "FROM responses WHERE type = 'Post-Asst' AND ref = trainings.id ORDER BY id DESC LIMIT 1), 0) postasst"
        );

        selectColumns.push(
          "(SELECT GROUP_CONCAT(" +
            "CAST(id AS CHAR CHARACTER SET utf8mb4), ':', " +
            "CAST(name AS CHAR CHARACTER SET utf8mb4), ':', " +
            "CAST(mobile AS CHAR CHARACTER SET utf8mb4) " +
            "SEPARATOR '->') " +
          "FROM users WHERE role = 'Trainer' AND FIND_IN_SET(id, trainings.trainers)) t_data"
        );

        selectColumns.push(
          "(SELECT GROUP_CONCAT(" +
            "CAST(id AS CHAR CHARACTER SET utf8mb4), ':', " +
            "CAST(name AS CHAR CHARACTER SET utf8mb4), ':', " +
            "CAST(mobile AS CHAR CHARACTER SET utf8mb4) " +
            "SEPARATOR '->') " +
          "FROM users WHERE role = 'Support' AND FIND_IN_SET(id, trainings.associates)) a_data"
        );

        selectColumns.push(
          "IF(type = 'ACADEMIC TRAINING' AND t_end < NOW(), TRUE, FALSE) certificate"
      );


    connection.query(`SELECT *, ${selectColumns.join(', ')} FROM trainings WHERE id = ?`, [id], (err, results) => {
      if (err) 
        res.status(500).json({ error: err.message });
      else {
        if (results.length === 0) 
          res.status(404).json({error: true, message: 'Data not found for the given ID' });
        
        results[0].locations = JSON.parse(results[0].locations);
        results[0].attendance = createSessions(results[0].t_start, results[0].t_end, results[0].att);
        if(results[0].t_data){
          const tmpArray = results[0].t_data.split('->');
          results[0].t_data = tmpArray.map(trainer => { const [Tid, name, mobile] = trainer.split(':'); return {id: parseInt(Tid), name: name, mobile: mobile};});
        } else 
          results[0].t_data = [];
        if(results[0].a_data){
          const tmpArray = results[0].a_data.split('->');
          results[0].a_data = tmpArray.map(trainer => { const [Aid, name, mobile] = trainer.split(':'); return {id: parseInt(Aid), name: name, mobile: mobile}; });
        } else 
          results[0].a_data = [];
        if(results[0].mdata){
          const tmpArray = results[0].mdata.split('->');
          results[0].mdata = tmpArray.map(trainer => { const [tid, mname, file, tname] = trainer.split(':-'); return {id: parseInt(tid), name: mname, file:JSON.parse(file), trainer: tname}; });
        } else 
          results[0].mdata = [];

        const detailedLocations = results[0].locations.map(location => {
          const { name: location_name, place: location_place, trainer: trainer_id, associate: associate_id, accomdation, accom_link } = location;
          const trainers = (Array.isArray(results[0]?.t_data) && Array.isArray(trainer_id)) ? results[0].t_data.filter(t => trainer_id.includes(t.id)) : [];
          const associates = (Array.isArray(results[0]?.t_data) && Array.isArray(associate_id)) ? results[0].a_data.filter(a => associate_id.includes(a.id)) : [];
          // res.status(500).json({ error: 'Check', trainers });
      
          const trainerDetails = trainers.map(trainer => ({id: trainer.id, name: trainer.name || null, mobile: trainer.mobile || null}));
          const associateDetails = associates.map(associate => ({id: associate.id, name: associate.name || null, mobile: associate.mobile || null}));
    
          return {location_name,
            location_place,
            trainers: trainerDetails,     
            associates: associateDetails,
            accomdation, accom_link
          };
        });

        const checklistAssignments = normalizeChecklistAssignments(
              results[0].checklist_assignments_info
            );

        results[0].details = detailedLocations;  
        results[0].checklist_assignments_info = checklistAssignments
        delete results[0].locations; 
        delete results[0].trainers; 
        delete results[0].associates; 
        delete results[0].t_data; 
        delete results[0].a_data; 
        res.json({ error: false, message: 'Training Detail', data: results[0], user });
      }
    });
  };

  exports.update = (req, res) => {  
    const id = req.params.id;
    const data = req.body;
    const user = req.user;
    let partColumns = [];     
    if(data.add_participants)
        partColumns.push("participants = CASE WHEN participants IS NULL OR participants = '' THEN '"+data.add_participants+"' ELSE CONCAT(participants, ',', '"+data.add_participants+"') END");
    
    if(data.add_observer){
      partColumns.push("observers = CASE WHEN observers IS NULL OR observers = '' THEN '"+data.add_observer+"' ELSE CONCAT(observers, ',', '"+data.add_observer+"') END");
      // sendObsInv({id:data.add_observer, tid:id, uid:user.id});
    }
    if(data.detail){
        partColumns.push(`detail = '${data.detail}'`);
        delete data.detail;
    }
    if(data.location){
        partColumns.push(`locations = '${JSON.stringify(data.location)}'`);
        delete data.location;
    }if(data.status){
        partColumns.push(`status = '${data.status}'`);
        delete data.status;
    }
    if(data.images)
        partColumns.push(`images = '${JSON.stringify(data.images)}'`);
    if(data.topic_covered)
        partColumns.push(`topic_covered = '${data.topic_covered}'`);
            
    let uQry = `UPDATE trainings SET ${partColumns.length ? partColumns.join(', ') : ''} WHERE id = ?`;        
    // console.log(uQry);
    connection.query(uQry, [id], (err) => {
    if (err) 
        res.status(500).json({ error: err.message, uQry, data});
    else 
        res.json({error: false, message: 'Form Updated', user});
    });
  };

  exports.getparts = (req, res) => {
    const id = req.params.id;
    const user = req.user;
    const {type, form} = req.query;
    qry = `SELECT id, type, name, staff_id, mobile, district, subject, s_type, invited, if(invited is null, 'pending', if(response is null, 'invited', response)) status, acc, JSON_UNQUOTE(JSON_EXTRACT(acc, '$.verified')) acc_verify FROM members left join (SELECT receiver, COUNT(*) invited FROM requests WHERE type = 'Train-Par' AND ref = ? group by receiver) inv on members.id = receiver left join (SELECT distinct created_by, replace(response,'"','') response FROM responses WHERE type = 'RSVP' AND ref = ?) rsvp on members.id = rsvp.created_by WHERE type = 'Teacher' and find_in_set(id, (SELECT replace(participants, ' ','') FROM trainings WHERE id = ?))`;
    connection.query(qry, [id, id, id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({error: true, message: 'No Participants added' });
          if(!type){
            const Participants = results.map(participant => ({
              ...participant,
              link: `https://mem.masclass.in/${encrypt(participant.id.toString().padStart(4, '0') + '2' + id.toString().padStart(4, '0'))}`,  
              bank_link: `https://mem.masclass.in/${encrypt(participant.id.toString().padStart(4, '0') + '6')}`     
            }));
            res.json({ error: false, message: 'Training Participants', data: Participants, user});
          }else if (type == 'Pre-Asst'){
            qry = `SELECT * FROM responses WHERE type = ? AND ref = ? order by id desc limit 1`;    
            connection.query(qry, [type, id], (err, rdata) => {
              if (err) 
                res.status(500).json({ error: err.message });
              else {
                if (rdata.length === 0) {                  
                  const data = {total:"", participants:results};  
                  res.json({ error: false, message: 'Training Pre Assesment Pending', data, user});
                }else{
                  const responseData = JSON.parse(rdata[0]['response']);
                  const combinedData = results.map(participant => {
                    const scoreEntry = responseData.score.find(score => score.id === String(participant.id));
                    return {
                      ...participant,
                      score: scoreEntry ? scoreEntry.pre : null
                    };
                  });     
                  const data = {total:responseData.total, participants:combinedData};  
                  res.json({ error: false, message: 'Training Pre Assesment', data, user});
                }
              }
            });
          }else if (type == 'Post-Asst'){
            qry = `SELECT * FROM responses WHERE type = ? AND ref = ? order by id desc limit 1`;    
            connection.query(qry, [type, id], (err, rdata) => {
              if (err) 
                res.status(500).json({ error: err.message });
              else {
                if (rdata.length === 0) {                  
                  const data = {total:"", participants:results};  
                  res.json({ error: false, message: 'Training Post Assesment Pending', data, user});
                }else{
                  const responseData = JSON.parse(rdata[0]['response']);
                  const combinedData = results.map(participant => {
                    const scoreEntry = responseData.score.find(score => score.id === String(participant.id));
                    return {
                      ...participant,
                      score: scoreEntry ? scoreEntry.post : null
                    };
                  });                     
                  const data = {total:responseData.total, participants:combinedData};                 
                  res.json({ error: false, message: 'Training Post Assesment', data, user});
                }
              }
            });
          }
          else if (type.startsWith("AT-")){
            qry = `SELECT JSON_UNQUOTE(JSON_EXTRACT(response, '$.participants')) present FROM responses WHERE type = 'Attendance' AND ref = ? AND JSON_UNQUOTE(JSON_EXTRACT(response, '$.session')) = ? order by id desc limit 1`; 
            connection.query(qry, [id, type.slice(3)], (err, rdata) => {
              if (err) 
                res.status(500).json({ error: err.message });
              else {
                if (rdata.length === 0) {
                  res.json({ error: false, message: 'Training Attendance Pending', data: results, user});
                }else{
                  const presentIds  = rdata[0]['present'].split(",").map(Number);
                  const Participants = results.map(participant => ({
                    ...participant,
                    attendance: presentIds.includes(participant.id) ? "present" : "absent"
                  }));
                  res.json({ error: false, message: 'Training Attendance', data: Participants, user});
                }
              }
            });
          } else if(type == 'sent') {
            qry = `SELECT receiver, count(*), created_at FROM requests WHERE type = 'Form' AND ref = ? GROUP BY receiver`; 
            connection.query(qry, [form], (err, rdata) => {
              if (err) 
                res.status(500).json({ error: err.message });
              else {
                if (rdata.length === 0) {
                  const Participants = results.map(participant => ({
                    ...participant,
                    status: "Pending"
                  }));
                  res.json({ error: false, message: 'Form Send Pending', data: Participants, user});
                }else{
                  const sentReceivers = new Set(rdata.map(record => record.receiver));
                  const Participants = results.map(participant => ({
                    ...participant,
                    status: sentReceivers.has(participant.id) ? "Sent" : "Pending"
                  }));
                  res.json({ error: false, message: 'Training Form Sent', data: Participants, user});
                }
              }
            });
          }else if(type == 'responded') {            
            qry = `SELECT created_by participant, response, created_at FROM responses WHERE type = 'feedback' AND ref = ?`; 
            connection.query(qry, [form], (err, rdata) => {
              if (err) 
                res.status(500).json({ error: err.message });
              else {
                if (rdata.length === 0) {
                  res.json({ error: false, message: 'Participants response Pending', data: results, user});
                }else{
                  // console.log(rdata);

                  const participantsData = results.map(participant => {
                    // Find the matching response by participant ID
                    const responseEntry = rdata.find(resp => resp.participant === participant.id);
                    const responseArray = responseEntry ? JSON.parse(responseEntry.response) : [];
                    const submitted = responseEntry ? responseEntry.created_at : "-";  
                    const participantData = {
                      participant: participant.name,
                      mobile: participant.mobile,
                      stype: participant.s_type,
                      subject: participant.subject,
                      district: participant.district,
                      submitted
                    };
                  
                    responseArray.forEach(response => {
                      participantData[response.q_id] = response.answer || 'No answer provided';
                    });
                    return participantData;
                  });
                  res.json({ error: false, message: 'Training Form Sent', data: participantsData, user});
                }
              }
            });
          }else if(type == 'certificate') {  
            qry = `SELECT type, response FROM responses WHERE type IN ('Attendance','Pre-Asst','Post-Asst') AND ref = ?`; 
            connection.query(qry, [id], (err, rdata) => {
              if (err) return res.status(500).json({ error: false, message: err.message });
              
              if (rdata.length === 0) return res.json({ error: false, message: 'Training Attendance Pending', data: results, user});
                
              // console.log(results, rdata);
              // const participants = ["2", "5", "7"];
              const attended = new Set();
              const preAsst = new Set();
              const postAsst = new Set();

              rdata.filter(r => r.type === "Attendance").forEach(r => {
                const response = JSON.parse(r.response);
                if (response.participants) {
                    response.participants
                        .split(",") // Split "2,7" into ["2", "7"]
                        .map(p => Number(p.trim())) // Convert to numbers
                        .forEach(p => attended.add(p));
                }
              });
              
              // Extract and process Pre-Asst data
              rdata.filter(r => r.type === "Pre-Asst").forEach(r => {
                  const response = JSON.parse(r.response);
                  response.score.forEach(s => preAsst.add(Number(s.id))); // Ensure IDs are numbers
              });
              
              // Extract and process Post-Asst data
              rdata.filter(r => r.type === "Post-Asst").forEach(r => {
                  const response = JSON.parse(r.response);
                  response.score.forEach(s => postAsst.add(Number(s.id))); // Ensure IDs are numbers
              });

              const Participants = results.map(participant => {                
                const isEligible = attended.has(participant.id) && preAsst.has(participant.id) && postAsst.has(participant.id);
                return{
                  ...participant,
                  attended: attended.has(participant.id),
                  preAsst: preAsst.has(participant.id),
                  postAsst: postAsst.has(participant.id),
                  ...(isEligible ? { link: `https://mem.masclass.in/${encrypt(participant.id.toString().padStart(4, '0') + '7' + id.toString().padStart(4, '0'))}` } : {})
                }
              });
              return res.json({ error: false, message: 'Training Certificate Elgiblity', data: Participants, user});     
            });
          } else if(type == 'tada') {            
            qry = `SELECT receiver, (SELECT response FROM responses WHERE type = 'account' AND created_by = receiver limit 1) response FROM requests WHERE type = 'Mem-TADA' AND ref = ? GROUP BY receiver`; 
            
            connection.query(qry, [id], (err, rdata) => {
              if (err) 
                res.status(500).json({ error: err.message });
              else {
                if (rdata.length === 0) {
                  res.json({ error: false, message: 'Participants TADA Pending', data: results, user});
                }else{
                  // console.log(rdata);
                  const participantsData = results.map(participant => {
                    const responseEntry = rdata.find(resp => resp.receiver === participant.id);
                    const responseArray = responseEntry ? JSON.parse(responseEntry.response) : [];
                    const submitted = responseEntry ? responseArray : false;                    
                    // console.log(submitted);
                    const participantData = {
                      participant: participant.name,
                      mobile: participant.mobile,
                      stype: participant.s_type,
                      subject: participant.subject,
                      district: participant.district,
                      submitted
                    };                
                    return participantData;
                  });
                  res.json({ error: false, message: 'TADA Received', data: participantsData, user});
                }
              }
            });
          }
    });
  };

  exports.getResponse = async (req, res) => {    
    const user = req.user; 
    const {type, fid} = req.params;   
    let qry = `SELECT u.id, u.name, mobile, response, r.created_at, (SELECT group_concat('"',id,'":"', quest,'"') FROM quests WHERE FIND_IN_SET(id, quests)) questions FROM forms f LEFT JOIN users u ON FIND_IN_SET(u.id, replace(participants, ' ','') ) LEFT JOIN responses r ON u.id = r.created_by and f.id = r.ref WHERE f.id = ?`; 
    if(type == 'observer')
      qry = `SELECT m.id, m.name, mobile, response, r.created_at, (SELECT group_concat('"',id,'":"', quest,'"') FROM quests WHERE FIND_IN_SET(id, quests)) questions FROM forms f LEFT JOIN members m ON FIND_IN_SET(m.id, replace(participants, ' ','') ) LEFT JOIN responses r ON m.id = r.created_by and f.id = r.ref WHERE f.id = ?`;

    connection.query(qry, [fid], (err, rdata) => {
      if (err) return res.status(500).json({ error: err.message });
      if (rdata.length === 0) return res.json({ error: false, message: 'Participants Not Available', user});
      
      const participantsData = rdata.map(participant => {         
        const submitted = participant.created_at ? participant.created_at : "-"; 
        const participantData = {
          [type === 'observer' ? 'observer' : 'trainer']: participant.name,
          mobile: participant.mobile,
          submitted
        };
        
        if(participant.response){
          const responseArray = JSON.parse(participant.response);
          responseArray.forEach(response => { participantData[response.q_id] = response.answer || 'No answer provided'; });
        }            
        return participantData;
      });
      const questions = JSON.parse('{'+rdata[0].questions.replace(/\n/g, "\\n")+'}');
      res.json({ error: false, message: 'Training Form Sent', data: participantsData, questions, user});    
    });

  }

  exports.getTraAtt = async (req, res) => {
    const id = req.params.id;
    const user = req.user;    
    connection.query("SELECT JSON_UNQUOTE(JSON_EXTRACT(response, '$.location')) loc, JSON_UNQUOTE(JSON_EXTRACT(response, '$.session')) ses, JSON_UNQUOTE(JSON_EXTRACT(response, '$.participants')) par FROM responses WHERE type = 'Attendance' AND ref = ?", [id], (err, results) => {
      if (err) 
          res.status(500).json({ error: err.message });
      else {
          if (results.length === 0) 
              res.status(404).json({error: true, message: 'Attendance Not Available' });
          else{ 
            // results[0].response = JSON.parse(results[0].par); 
            connection.query(`SELECT id, name, staff_id, mobile, district FROM members WHERE find_in_set(id,  (SELECT group_concat(JSON_UNQUOTE(JSON_EXTRACT(response, '$.participants'))) FROM responses WHERE type = 'Attendance' AND ref = ?))`, [id], (err, trainees) => {
              if (err) {
                res.status(500).json({ error: err.message });
                return;
              }
              results.forEach(session => {
                const participants = session.par.split(',').map(Number);
                trainees.forEach(trainee => {
                  if (participants.includes(trainee.id))
                      trainee[session.ses] = 1; 
                  else 
                      trainee[session.ses] = 0; 
                });
                delete session.par;
              });
              res.json({error: false, message: 'Training Attendance Data', sessions: results, trainees});                 
            }); 
          }         
        }
      });
  };

  exports.getTrafrms = async (req, res) => {
    const id = req.params.id;
    const user = req.user;    
    connection.query("SELECT id, type,  name, detail, (SELECT count(distinct receiver) FROM requests WHERE type = 'Form' AND ref = forms.id) sent, (SELECT count(distinct created_by) FROM responses WHERE type = 'Feedback' AND ref = forms.id) received FROM forms WHERE left(type, 8) = 'Training' AND ref = ?", [id], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (results.length === 0) return res.status(404).json({error: true, message: 'Training Forms Not Available' });
      results.forEach(form => {        
        form.isTeacher = form.type === 'Training'; 
        form.isTrainer = form.type === 'Training-T';
        form.isObserver = form.type === 'Training-O'; 
      });
      return res.json({error: false, message: 'Training Forms', data: results, user});                       
    }); 
  };

  exports.tstmsg = (req, res) => {
    const params = {
      messageId: req.query.messageId,
      recipient: req.query.recipient
    };

    sendGetRequest(params, (err, response) => {
        if (err) {
            return res.status(500).json({ error: true, message: 'Failed to fetch message', details: err.message });
        }

        res.json({ error: false, message: 'Message fetched successfully', data: response });
    });
  };

  exports.rptData = (req, res) => {
    const user = req.user;
    const id = req.params.id;
    let selectColumns = ["id", "type", "name", "detail", "t_start",	"t_end", "school", "subject", "sessions", "locations", "images"];     
    selectColumns.push("(LENGTH(participants) - LENGTH(REPLACE(participants, ',', '')) + 1) invited");
    selectColumns.push(`(SELECT group_concat(concat('{"id":',id,',"name":"',name,'","staff_id":"',staff_id,'","mobile":"',mobile,'","district":"',district,'","subject":"',subject,'","e_type":"',e_type,'"}')) FROM members WHERE find_in_set(id, participants)) member`);
    // selectColumns.push("(SELECT (LENGTH(JSON_UNQUOTE(JSON_EXTRACT(response, '$.participants'))) - LENGTH(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(response, '$.participants')), ',', '')) + 1) FROM responses WHERE type = 'attendance' AND ref = trainings.id limit 1) attendance");    
    selectColumns.push("(SELECT JSON_UNQUOTE(JSON_EXTRACT(response, '$.participants')) FROM responses WHERE type = 'attendance' AND ref = trainings.id limit 1) att");
    selectColumns.push("(SELECT count(distinct created_by) FROM responses WHERE type = 'RSVP' AND ref = trainings.id) accepted");
    selectColumns.push(`ifnull((SELECT JSON_UNQUOTE(JSON_EXTRACT(response, '$.score')) FROM responses WHERE type = 'Pre-Asst' AND ref = trainings.id  limit 1),0) preasst`);
    selectColumns.push(`ifnull((SELECT JSON_UNQUOTE(JSON_EXTRACT(response, '$.score')) FROM responses WHERE type = 'Post-Asst' AND ref = trainings.id limit 1),0) postasst`);

    connection.query(`SELECT ${selectColumns.join(', ')}  FROM trainings WHERE id = ${id}`, (err, results) => {
      if (err) return res.status(500).json({ error: err });
      if (results.length === 0) return res.status(404).json({error: true, message: 'Training Not Available' });
      const data = results[0];      
      data.school = JSON.parse(data.school);
      data.subject = JSON.parse(data.subject);
      data.sessions = JSON.parse(data.sessions);
      if(data.images)
        data.images = JSON.parse(data.images);
      data.member = JSON.parse('['+data.member+']');
      const locationArray = JSON.parse(data.locations);
      if(Array.isArray(locationArray)) data.locations = locationArray.map(item => item.place+' -'+item.name || '').join(', '); else data.locations = '';
      if(data.att)
        data.attendance = data.att.split(',').length;
      const attIds = (data.att || "").split(',') .filter(Boolean).map(id => parseInt(id));
      data.member.forEach(member => {member.attendance = attIds.includes(member.id) ? true : false;});
      data.avg_att = (data.attendance/ data.invited * 100).toFixed(2);
      if(data.preasst != 0){
        const prdata = JSON.parse(data.preasst);
        const totalPre = prdata.reduce((sum, item) => sum + parseFloat(item.pre), 0);
        data.avg_pre_assessment = (totalPre / prdata.length).toFixed(2);
        const preMap = Object.fromEntries(prdata.map(p => [parseInt(p.id), p.pre]));
        data.member.forEach(member => {if (preMap[member.id]) {member.pre_assessment = preMap[member.id];}});
      }
      if(data.postasst != 0){
        const ptdata = JSON.parse(data.postasst);
        const totalPst = ptdata.reduce((sum, item) => sum + parseFloat(item.post), 0);
        data.avg_post_assessment = (totalPst / ptdata.length).toFixed(2);
        const postMap = Object.fromEntries(ptdata.map(p => [parseInt(p.id), p.post]));
        data.member.forEach(member => {if (postMap[member.id]) {member.post_assessment = postMap[member.id];}});
      }
      delete data.preasst; delete data.postasst; delete data.att; 
      return res.json({error: false, message: 'Training Report', data, user});  //{invited, accepted, attendance, avg_att, sessions}
    });
  };

  exports.chartData = (req, res) => {
    const user = req.user;  
    const {id, type} = req.params;         
    let sql = ``; 

    if(type && type == 'participant-sbj')    
      sql = `SELECT COUNT(*) participants, subject FROM members WHERE find_in_set(id, (SELECT participants FROM trainings WHERE id = '${id}')) GROUP BY subject`;
    else if(type && type == 'attendance')    
      sql = `SELECT JSON_UNQUOTE(JSON_EXTRACT(response, '$.session')) session, (LENGTH(JSON_UNQUOTE(JSON_EXTRACT(response, '$.participants'))) - LENGTH(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(response, '$.participants')), ',', '')) + 1) participants 
        FROM responses WHERE type = 'Attendance' AND ref = '${id}' GROUP BY JSON_UNQUOTE(JSON_EXTRACT(response, '$.session'))`;
    else if(type && type == 'assesment')    
      sql = `SELECT ifnull((SELECT response FROM responses WHERE type = 'Pre-Asst' AND ref = trainings.id  limit 1),0) preasst, ifnull((SELECT response FROM responses WHERE type = 'Post-Asst' AND ref = trainings.id limit 1),0) postasst FROM trainings WHERE id = '${id}'`;
           
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: true,  message: err.message });            
        if (results.length == 0) return res.status(404).json({ error: true, message: type+' not found' });
        let data = results;
        if(type && type == 'assesment' && results[0].preasst != 0 && results[0].postasst != 0){
          data = [
          {
            type: 'Pre-Asst',
            response: JSON.parse(results[0].preasst) //{ total: '10', score: [ { id: '2', pre: '7' }, { id: '3', pre: '4' } ] }
          },
          {
            type: 'Post-Asst',
            response: JSON.parse(results[0].postasst) //{ total: '10', score: [ { id: '2', post: '9' }, { id: '3', post: '8' }, { id: '4', post: '6' } ] }
          }
        ];
        // console.log(data);
          // const resData = JSON.parse(results);
          const preData = data.find(d => d.type === 'Pre-Asst')?.response || { total: '0', score: [] };
          const postData = data.find(d => d.type === 'Post-Asst')?.response || { total: '0', score: [] };

          const merged = {};

          // Add pre scores
          preData.score.forEach(entry => {
            merged[entry.id] = { id: entry.id, pre: entry.pre || '', post: '' };
          });

          postData.score.forEach(entry => {
            if (merged[entry.id]) {
              merged[entry.id].post = entry.post || '';
            } else {
              merged[entry.id] = { id: entry.id, pre: '', post: entry.post || '' };
            }
          });
          data = merged;
        }
        res.json({error: true, message: type.charAt(0).toUpperCase() + type.slice(1) + ' Chart Data', data, user});
    });
  };

exports.FBres = (req, res) => {  
  const user = req.user;
  const id = req.params.id;

  const query = `SELECT distinct created_by, response FROM responses WHERE type = 'Feedback' AND ref = (SELECT id FROM forms WHERE type = 'Training' AND detail = 'Teachers Feedback Form' AND ref = ${id} limit 1 )`;

  connection.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });   
    if (results.length === 0) return res.status(404).json({ error: true, message: 'Training Feedbacks not avaiable' });    
    const questionMap = {};
    results.forEach(entry => {
      const responses = JSON.parse(entry.response);
      
      responses.forEach(res => {
        const qid = res.q_id;
        const question = res.question.trim();
        const answer = res.answer;

        if (!questionMap[qid]) {questionMap[qid] = {question, type: res.q_type, answers: {} };}

        // Handle array answers (like checkbox/multiselect or scored lists)
        if (Array.isArray(answer)) {
          answer.forEach(ans => {
            let ansText = ans;
            if (typeof ans === 'string' && ans.includes(',,')) {
              ansText = ans.split(',,')[0]; // Get label part
            }
            questionMap[qid].answers[ansText] = (questionMap[qid].answers[ansText] || 0) + 1;
          });
        }else {
          questionMap[qid].answers[answer] = (questionMap[qid].answers[answer] || 0) + 1;
        }
      });
    });
    
    const reportKeywords = [
      { key: 1, text: 'rate the overall quality of the training' },
      { key: 2, text: 'rate the resource person’s subject knowledge and teaching' },
      { key: 3, text: 'cover essential topics relevant to competitive exams' },
      { key: 4, text: 'problem-solving sessions in improving your skills' }
    ];
    const finalData = Object.values(questionMap).map((q) => {
      for (const item of reportKeywords) {
        if (q.question.toLowerCase().includes(item.text.toLowerCase())) {
          q.report_question = item.key;
          break;
        }
      }
      return q;
    });
    // console.log(questionMap);
    res.json({ error: false, message: 'Training Feedbacks', data: finalData, user});
  });
}

exports.FBRaw = (req, res) => {  
  const user = req.user;
  const {id, type} = req.params;
  let sqlKeys = []; sqlKeys.where = [`ref = ${id}`, `type = 'Training'`];
  if(type)
    sqlKeys.where.push(`detail like '%${type}%'`);

  const query = `SELECT (SELECT concat(name, ' (', mobile, ')') FROM members WHERE id = responses.created_by) name, response FROM responses WHERE type = 'Feedback' AND ref = (SELECT id FROM forms WHERE ${sqlKeys.where.join(' AND ')} )`;

  connection.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });   
    if (results.length === 0) return res.status(404).json({ error: true, message: 'Training Feedbacks not avaiable' });   
    results.forEach(entry => {entry.response = JSON.parse(entry.response);});
    res.json({ error: false, message: 'Full Feedbacks', data: results, user});
  });
}

exports.FBDetail = (req, res) => {  
  const user = req.user;
  const {trainings, senders} = req.params;
  const traArr = trainings.split(',').map(id => parseInt(id))
  const sendersArr = senders.split(',').map(id => parseInt(id))
  let sqlKeys = []; sqlKeys.select = ['response']; sqlKeys.where = [`type = 'Feedback'`, `ref in (SELECT id FROM forms WHERE type = 'Training' AND ref in (?))`, `created_by in (?)`];
  sqlKeys.group = '';  sqlKeys.params = [traArr, sendersArr];

  if (traArr.length > 1 || sendersArr.length > 1){
      sqlKeys.select.push(`(SELECT ref FROM forms WHERE id = responses.ref) t_id`);
      sqlKeys.group = 'GROUP BY ref, created_by';
  }

  const query = `SELECT ${sqlKeys.select.join(', ')} FROM responses WHERE id in (SELECT max(id) FROM responses WHERE ${sqlKeys.where.join(' AND ')} ${sqlKeys.group})`;
  // console.log(query);
  connection.query(query, sqlKeys.params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });   
    if (results.length === 0) return res.status(404).json({ error: true, message: 'Training Feedbacks not avaiable' });   
    // console.log(results);
    
    results.forEach(entry => {
      entry.response = JSON.parse(entry.response);          

    });
    let data = [];
    if (traArr.length == 1 && sendersArr.length == 1) {
        data = results[0].response;
    } else{
     const qtypes = [5, 6, 7, 9, 12];
    data = results.reduce((acc, { t_id, response }) => {
      if (!acc[t_id]) acc[t_id] = {};
      response
        .filter(q => qtypes.includes(parseInt(q.q_type))) // ensure numeric match
        .forEach(q => {
          const key = parseInt(q.q_type);
          const answers = Array.isArray(q.answer) ? q.answer : [q.answer];

          const questionEntry = acc[t_id][q.q_id] || {
            key,
            question: q.question,
            answers: {}
          };

          answers.forEach(ans => {
            questionEntry.answers[ans] = (questionEntry.answers[ans] || 0) + 1;
          });

          acc[t_id][q.q_id] = questionEntry;
        });

      return acc;
    }, {});

    // Convert grouped object to array
    const groupedData = Object.entries(data).map(([t_id, questionMap]) => ({
      t_id: parseInt(t_id),
      questions: Object.values(questionMap)
    }));
    }
    res.json({ error: false, message: 'Full Feedbacks', data, user});
  });
}

exports.getFrmsPar = (req, res) => {
    const user = req.user;
    const id = req.params.id;
    const QyrParams = []; QyrParams.select = ['id', 'type'];
    QyrParams.select.push(`(SELECT GROUP_CONCAT('{"date":"',created_at,'","id":', receiver, '}') FROM requests WHERE type = 'Form' AND ref = '101' AND FIND_IN_SET(receiver, replace(participants,' ',''))) sent`);
    QyrParams.select.push(`(SELECT GROUP_CONCAT('{"id":', created_by,',"response":',response, '}') FROM responses WHERE type = 'Feedback' AND ref = '101' AND FIND_IN_SET(created_by, replace(participants,' ',''))) received`);
    qry = `SELECT  FROM forms WHERE id = ?`; 
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

  exports.createOld = async (req, res) => {
    let data = req.body;
    const user = req.user;
    data.created_by = user.id;
    const{subject, s_type} = data;
    if (data.school) 
      data.school = JSON.stringify(data.school);
    if (data.s_type) 
      data.s_type = JSON.stringify(data.s_type);
    if (data.subject) 
      data.subject = JSON.stringify(data.subject);
    if (data.locations) {
      let trainers = [];
      let associates = [];
      const loc = data.locations;
      loc.forEach(location => {
        trainers = trainers.concat(location.trainer || []);
        associates = associates.concat(location.associate || []);
      });
      data.trainers = trainers.join(',');
      data.associates = associates.join(',');      
      data.sessions = JSON.stringify(data.sessions);
      data.locations = JSON.stringify(data.locations);
    }
    // res.status(500).json({ error: 'Check', subject, stype});    
    connection.query(`SELECT group_concat(id) ids FROM members WHERE status = 'Active' AND subject in (?) AND s_type in (?)`, [subject, s_type],(err, results) => {
      if (err) {
        res.status(500).json({ error: err.message, data:data });
      } else {
        data.participants = results[0].ids;
        connection.query('INSERT INTO trainings SET ?', data, (err, results) => {
          if (err) {
            res.status(500).json({ error: err.message, data:data });
          } else {
            // const params = "TNMSC conducting "+data.name+"Scheduled on "+data.t_start+",\n Need to register in https://mem.masclass.in/bbextbbbg";
            // sendTraining(params, nums, (err, response) => {if (err) { return res.status(500).json({ error: true, message: 'Failed to fetch message', details: err.message });}});
                        
            res.json({error: false, message: 'Training Created Successfully', data:results, user});
          }        
        });
      }
    });
  };

exports.create = (req, res) => {
    let data = req.body;
    const user = req.user;
    data.created_by = user.id;
	console.log(req.body);

    const { subject, s_type, trainingType, trainingMode } = data;

    let checklistRootId = null;
    let checklistStatusFlag = 0; 

    if (data.school) 
      data.school = JSON.stringify(data.school);
    if (data.s_type) 
      data.s_type = JSON.stringify(data.s_type);
    if (data.subject) 
      data.subject = JSON.stringify(data.subject);

    if (data.locations) {
      let trainers = [];
      let associates = [];
      const loc = data.locations;
      loc.forEach(location => {
        trainers = trainers.concat(location.trainer || []);
        associates = associates.concat(location.associate || []);
      });
      data.trainers = trainers.join(',');
      data.associates = associates.join(',');
      data.sessions = JSON.stringify(data.sessions);
      data.locations = JSON.stringify(data.locations);
    }
    
    if (trainingType && trainingMode) {
        
        const checklistQuery = `
          SELECT id 
          FROM master 
          WHERE type = 'CheckList' 
            AND trainingType = ? 
            AND trainingMode = ? 
            AND status = 'Active' 
          LIMIT 1
        `;
        
        connection.query(checklistQuery, [trainingType, trainingMode], (checklistErr, checklistResults) => {
            if (checklistErr) {
                console.error("Error fetching checklist root ID:", checklistErr);
                checklistStatusFlag = 2; 
            } else if (checklistResults && checklistResults.length > 0) {
                // Checklist found (Flag 1)
                checklistRootId = checklistResults[0].id;
                checklistStatusFlag = 1; 
            } else {
                // No checklist found (Flag 2)
                checklistStatusFlag = 2;
            }

            finalizeTrainingCreation(res, connection, data, checklistRootId, checklistStatusFlag, user, subject, s_type);
        });
        
    } else {
        finalizeTrainingCreation(res, connection, data, checklistRootId, checklistStatusFlag, user, subject, s_type);
    }
};

// function finalizeTrainingCreation(res, connection, data, checklistRootId, checklistStatusFlag, user, subject, s_type) {
    
//     data.checklistRootId = checklistRootId;
//     data.flag = checklistStatusFlag;
    
//     connection.query(`SELECT group_concat(id) ids FROM members WHERE status = 'Active' AND subject in (?) AND s_type in (?)`, [subject, s_type],(err, results) => {
//         if (err) {
//             return res.status(500).json({ error: err.message, data: data });
//         } 
        
//         data.participants = results[0].ids;
        
//         connection.query('INSERT INTO trainings SET ?', data, (err, results) => {
//             if (err) {
//                 return res.status(500).json({ error: err.message, data: data });
//             }
            
//             res.json({
//                 error: false, 
//                 message: 'Training Created Successfully', 
//                 data: results, 
//                 flag: checklistStatusFlag,
//                 checklistRootId: checklistRootId,
//                 user
//             });
//         });
//     });
// }


function finalizeTrainingCreation(res, connection, data, checklistRootId, checklistStatusFlag, user, subject, s_type) {
    
    data.checklistRootId = checklistRootId;
    data.flag = checklistStatusFlag;
    
    // Handle dynamic WHERE clause based on presence of subject and s_type
    let query = `SELECT group_concat(id) ids FROM members WHERE status = 'Active'`;
    let queryParams = [];
    
    if ((subject && subject.length > 0) && (s_type && s_type.length > 0)) {
      // console.log('Both subject and s_type provided', subject, s_type);
        // Both provided: current logic
        query += ` AND subject IN (?) AND s_type IN (?)`;
        queryParams = [subject, s_type];
    } else if ((subject && subject.length > 0)) {
      // console.log('Only subject provided');
        // Only subject provided
        query += ` AND subject IN (?)`;
        queryParams = [subject];
    } else if ((s_type && s_type.length > 0)) {
      // console.log('Only s_type provided');
        // Only s_type provided
        query += ` AND s_type IN (?)`;
        queryParams = [s_type];
    }
    // If neither provided: query runs without subject/s_type filters
    console.log('Final Query:', query, 'Params:', queryParams);
    
    connection.query(query, queryParams, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message, data: data });
        } 
        
        // Handle case where no results found (results[0] might be undefined)
        data.participants = results[0] && results[0].ids ? results[0].ids : null;
        
        connection.query('INSERT INTO trainings SET ?', data, (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message, data: data });
            }
            
            res.json({
                error: false, 
                message: 'Training Created Successfully', 
                data: results, 
                flag: checklistStatusFlag,
                checklistRootId: checklistRootId,
                user
            });
        });
    });
}


exports.updateAssignmentInfo_old_02_02_2025 = async (req, res) => {
    console.log(req.body);
    const promiseConnection = connection.promise(); // Assumes connection is imported
    
    // 1. Input Validation and Extraction (UPDATED)
    const { id, checklistRootId, assignments } = req.body;

    if (!id || !checklistRootId || !Array.isArray(assignments) || assignments.length === 0) {
        return res.status(400).json({ 
            error: true, 
            message: 'Missing required fields (id, checklistRootId) or the assignments array is invalid/empty.' 
        });
    }

    try {
       
        const fetchQuery = `
            SELECT checklist_assignments_info 
            FROM trainings 
            WHERE id = ?
        `;

        const [results] = await promiseConnection.query(fetchQuery, [id]);

        if (results.length === 0) {
            return res.status(404).json({ error: true, message: `Training ID ${id} not found.` });
        }
        
  
        const currentJson = results[0].checklist_assignments_info; 
        
     
        let assignmentsArray;
        try {
            assignmentsArray = currentJson ? JSON.parse(currentJson) : [];
            if (!Array.isArray(assignmentsArray)) {
                assignmentsArray = [];
            }
        } catch (e) {
            console.warn(`JSON parsing error for training ${id}. Resetting assignment array.`, e);
            assignmentsArray = [];
        }

        const newEntriesAdded = [];

        
        for (const newAssignment of assignments) {
            const { checklistId, memberId, dateOfAssignment, parentId } = newAssignment;
            
           
            if (!checklistId || !memberId || !dateOfAssignment || !parentId) {
                 console.warn(`Skipping invalid assignment entry:`, newAssignment);
                 continue; 
            }

            // assignment object for merging
            const assignmentEntryToMerge = {
                rootId: checklistRootId,
                parentId: parentId ,
                itemId: checklistId,
                memberId: memberId,
                assignDate: dateOfAssignment ,
                status: 'Pending'
            };
            
       
            const existingIndex = assignmentsArray.findIndex(item => 
                item.itemId === checklistId && item.memberId === memberId
            );

            if (existingIndex !== -1) {
                // Merge the new data into the existing slot
                assignmentsArray[existingIndex] = { 
                    ...assignmentsArray[existingIndex], 
                    ...assignmentEntryToMerge 
                };
            } else {
                assignmentsArray.push(assignmentEntryToMerge);
                newEntriesAdded.push(assignmentEntryToMerge);
            }
        }

       
        const updatedJsonString = JSON.stringify(assignmentsArray);

  
        const updateData = {
            checklist_assignments_info: updatedJsonString
        };
        
        const updateQuery = `
            UPDATE trainings 
            SET ?
            WHERE id = ?
        `;

        await promiseConnection.query(updateQuery, [updateData, id]);

        return res.status(200).json({
            error: false,
            message: `Successfully processed ${assignments.length} assignment updates.`,
            newEntriesAddedCount: newEntriesAdded.length,
            totalEntriesInTable: assignmentsArray.length
        });

    } catch (error) {
        console.error('API execution error during assignment update:', error);
        return res.status(500).json({
            error: true,
            message: `Internal server error: ${error.message}`
        });
    }
};



exports.updateAssignmentInfo = async (req, res) => {
    console.log(req.body);
    const promiseConnection = connection.promise();

    const { id, checklistRootId, assignments } = req.body;
    console.log('Received data:', id, checklistRootId, assignments);

    if (!id || !checklistRootId || !Array.isArray(assignments) || assignments.length === 0) {
        return res.status(400).json({ 
            error: true, 
            message: 'Missing required fields (id, checklistRootId) or the assignments array is invalid/empty.' 
        });
    }

    try {
        const fetchQuery = `
            SELECT checklist_assignments_info 
            FROM trainings 
            WHERE id = ?
        `;
        const [results] = await promiseConnection.query(fetchQuery, [id]);

        if (results.length === 0) {
            return res.status(404).json({ error: true, message: `Training ID ${id} not found.` });
        }

        const currentJson = results[0].checklist_assignments_info;
        // console.log('Current JSON from DB:', currentJson);

        let assignmentsArray;
        try {
            assignmentsArray = currentJson ? JSON.parse(currentJson) : [];
            if (!Array.isArray(assignmentsArray)) assignmentsArray = [];
        } catch (e) {
            console.warn(`JSON parsing error for training ${id}. Resetting assignment array.`, e);
            assignmentsArray = [];
        }
        // console.log('Parsed assignments array:', assignmentsArray);

        const { finalAssignments, stats } = processAssignments(assignmentsArray, assignments, checklistRootId);
        
        const updatedJsonString = JSON.stringify(finalAssignments);
        const updateData = { checklist_assignments_info: updatedJsonString };
        const updateQuery = `UPDATE trainings SET ? WHERE id = ?`;
        await promiseConnection.query(updateQuery, [updateData, id]);

        return res.status(200).json({
            error: false,
            message: `Successfully processed ${assignments.length} assignment updates.`,
            ...stats
        });

    } catch (error) {
        console.error('API execution error during assignment update:', error);
        return res.status(500).json({
            error: true,
            message: `Internal server error: ${error.message}`
        });
    }
};

function processAssignments(existingAssignments, incomingAssignments, checklistRootId) {
    const byKey = new Map(); // `${itemId}_${memberId}` -> assignment
    const byItemId = new Map(); // itemId -> array of assignments

    // Index existing assignments
    for (const assignment of existingAssignments) {
        const key = `${assignment.itemId}_${assignment.memberId}`;
        byKey.set(key, assignment);

        if (!byItemId.has(assignment.itemId)) {
            byItemId.set(assignment.itemId, []);
        }
        byItemId.get(assignment.itemId).push(assignment);
    }

    const incomingKeys = new Set();
    const stats = { newAdded: 0, updated: 0, reassigned: 0, deleted: 0, totalEntries: 0 };

    // Process incoming assignments FIRST
    for (const incoming of incomingAssignments) {
        const { checklistId, memberId, dateOfAssignment, parentId } = incoming;
        
        if (!checklistId || !memberId || !dateOfAssignment || !parentId) {
            console.warn(`Skipping invalid assignment:`, incoming);
            continue;
        }

        const key = `${checklistId}_${memberId}`;
        incomingKeys.add(key);

        const newAssignmentData = {
            rootId: checklistRootId,
            parentId,
            itemId: checklistId,
            memberId,
            assignDate: dateOfAssignment
        };

        const existing = byKey.get(key);

        if (existing) {
            // UPDATE same checklist + member
            Object.assign(existing, newAssignmentData);
            stats.updated++;
            // console.log(`✓ Updated: ${key}`);
        } else {
            // Check reassignment (same checklist, different member)
            const existingForChecklist = byItemId.get(checklistId) || [];
            const activeAssignments = existingForChecklist.filter(a => !isHistory(a));

            if (activeAssignments.length > 0) {
                // REASSIGNMENT: mark previous active as history
                const previousActive = activeAssignments[activeAssignments.length - 1];
                const historyOrder = getNextHistoryOrder(existingForChecklist);
                
                previousActive.info = `History${historyOrder}`;
                previousActive.historyOrder = historyOrder;
                
                // Add new assignment as active
                const newAssignment = {
                    ...newAssignmentData,
                    info: 'Reassigned',
                    historyOrder: 0
                };
                
                existingAssignments.push(newAssignment);
                byKey.set(key, newAssignment);
                if (!byItemId.has(checklistId)) byItemId.set(checklistId, []);
                byItemId.get(checklistId).push(newAssignment);
                
                stats.reassigned++;
                // console.log(`✓ Reassigned ${checklistId}: ${previousActive.memberId} → ${memberId} (History${historyOrder})`);
            } else {
                // NEW assignment
                const newAssignment = {
                    ...newAssignmentData,
                    info: null,
                    status: 'Pending',
                    historyOrder: 0
                };
                
                existingAssignments.push(newAssignment);
                byKey.set(key, newAssignment);
                if (!byItemId.has(checklistId)) byItemId.set(checklistId, []);
                byItemId.get(checklistId).push(newAssignment);
                
                stats.newAdded++;
                // console.log(`✓ New: ${key}`);
            }
        }
    }

    // HARD DELETE: remove non-history assignments not in incoming request
    const finalAssignments = [];
    for (const assignment of existingAssignments) {
        const key = `${assignment.itemId}_${assignment.memberId}`;
        
        if (isHistory(assignment) || incomingKeys.has(key)) {
            finalAssignments.push(assignment);
        } else {
            stats.deleted++;
            // console.log(`✗ Deleted: ${key}`);
        }
    }

    stats.totalEntries = finalAssignments.length;
    // console.log('Final stats:', stats);
    return { finalAssignments, stats };
}

function isHistory(assignment) {
    return assignment && assignment.info && assignment.info.startsWith('History');
}

function getNextHistoryOrder(assignmentsForChecklist) {
    let maxHistory = 0;
    for (const assignment of assignmentsForChecklist) {
        if (assignment.historyOrder && assignment.historyOrder > maxHistory) {
            maxHistory = assignment.historyOrder;
        }
    }
    return maxHistory + 1;
}

exports.getAssignmentInfo = async (req, res) => {
    const promiseConnection = connection.promise(); 
    const trainingId = req.params.id; 

    if (!trainingId) {
        return res.status(400).json({ 
            error: true, 
            message: 'Missing required parameter: training ID.' 
        });
    }

    try {
        const fetchQuery = `
            SELECT checklist_assignments_info
            FROM trainings 
            WHERE id = ?
        `;

        const [results] = await promiseConnection.query(fetchQuery, [trainingId]);

        if (results.length === 0) {
            return res.status(404).json({ error: true, message: `Training ID ${trainingId} not found.` });
        }
        
        const currentJson = results[0].checklist_assignments_info;
        
        let assignmentsArray;
        try {
            assignmentsArray = currentJson ? JSON.parse(currentJson) : [];
            if (!Array.isArray(assignmentsArray)) {
                assignmentsArray = [];
            }
        } catch (e) {
            console.error(`JSON parsing error for training ${trainingId}:`, e);
            return res.status(500).json({ error: true, message: 'Failed to parse assignment data.' });
        }
        
        if (assignmentsArray.length === 0) {
            return res.status(200).json({ 
                error: false, 
                message: 'No assignments found for this training.',
                assignments: []
            });
        }
        
        // Extract unique IDs for lookups
        const uniqueChecklistIds = [...new Set(assignmentsArray.map(item => item.itemId))];
        const uniqueMemberIds = [...new Set(assignmentsArray.map(item => item.memberId))];

        // Fetch Checklist Names from master 
        const checklistNameMap = new Map();
        if (uniqueChecklistIds.length > 0) {
            const checklistQuery = `
                SELECT id, name AS checklistName 
                FROM master 
                WHERE id IN (?)
            `;
            const [checklistResults] = await promiseConnection.query(checklistQuery, [uniqueChecklistIds]);
            checklistResults.forEach(row => checklistNameMap.set(row.id, row.checklistName));
        }

        // Fetch Member Names from users
        const memberNameMap = new Map();
        if (uniqueMemberIds.length > 0) {
            const memberQuery = `
                SELECT id, name AS memberName 
                FROM users
                WHERE id IN (?)
            `;
            const [memberResults] = await promiseConnection.query(memberQuery, [uniqueMemberIds]);
            memberResults.forEach(row => memberNameMap.set(row.id, row.memberName));
        }

        const enrichedAssignments = assignmentsArray.map(assignment => ({
            rootId: assignment.rootId,
            itemId: assignment.itemId,
            memberId: assignment.memberId,
            assignDate: assignment.assignDate,
            status: assignment.status,
            checklistName: checklistNameMap.get(assignment.itemId) || 'Name Not Found',
            memberName: memberNameMap.get(assignment.memberId) || 'Name Not Found',
            startDate: assignment.startDate || null,
            endDate: assignment.endDate || null,
            comments: assignment.comments || null,
            // reassignDate: assignment.reassignDate || null,
            // reassigned: assignment.reassigned || null,
            info: assignment.info || null,
            historyOrder: assignment.historyOrder ?? null,
        }));

        return res.status(200).json({
            error: false,
            message: 'Checklist assignments retrieved and enriched successfully.',
            trainingId: trainingId,
            assignments: enrichedAssignments,
            totalEntries: enrichedAssignments.length
        });

    } catch (error) {
        console.error('API execution error during assignment retrieval:', error);
        return res.status(500).json({
            error: true,
            message: `Internal server error: ${error.message}`
        });
    }
};

exports.getAssignedTrainingsByMember = async (req, res) => {
    const promiseConnection = connection.promise();
    // 1. Extract the member ID from the URL parameters
    const memberId = req.params.memberId;

    if (!memberId) {
        return res.status(400).json({
            error: true,
            message: 'Missing required parameter: memberId.'
        });
    }
    
   const memberIdString = String(memberId);
    

    const searchFragment = `"memberId":${memberIdString}`;

    try {

        const fetchQuery = `
            SELECT 
                id, 
                name, 
                flag,
                checklistRootId,
                checklist_assignments_info
            FROM trainings 
            WHERE 
            checklist_assignments_info LIKE CONCAT('%', ?, '%')
        `;

        const [results] = await promiseConnection.query(fetchQuery, [searchFragment]);

        
        const assignedTrainings = [];

        for (const training of results) {
            let assignmentsArray = [];
            
            try {
                const currentJson = training.checklist_assignments_info;
                assignmentsArray = currentJson ? JSON.parse(currentJson) : [];
            } catch (e) {
                console.warn(`JSON parsing error for training ID ${training.id}:`, e);
                continue; 
            }
            
            
            const memberAssignments = assignmentsArray.filter(
                assignment => String(assignment.memberId) === memberIdString
            );

            if (memberAssignments.length > 0) {
                assignedTrainings.push({
                    trainingId: training.id,
                    trainingName: training.name,
                    flag: training.flag,
                    checklistRootId: training.checklistRootId,
                    assignments: memberAssignments, 
                    totalAssignedItems: memberAssignments.length
                });
            }
        }

  
        if (assignedTrainings.length === 0) {
            return res.status(200).json({ 
                error: false, 
                message: `No trainings found assigned to member ID ${memberId}.`,
                trainings: []
            });
        }

        return res.status(200).json({
            error: false,
            message: 'Assigned trainings retrieved successfully.',
            memberId: memberId,
            totalTrainings: assignedTrainings.length,
            trainings: assignedTrainings
        });

    } catch (error) {
        console.error('API execution error during assigned training retrieval:', error);
        return res.status(500).json({
            error: true,
            message: `Internal server error: ${error.message}`
        });
    }
};

exports.updateAssignmentStatus = async (req, res) => {
    console.log(req.body);
    const promiseConnection = connection.promise(); 

    const { 
        trainingId, 
        checklistId, 
        memberId, 
        startDate, 
        endDate,
        comments 
    } = req.body;

    if (!trainingId || !checklistId || !memberId) {
        return res.status(400).json({ 
            error: true, 
            message: 'Missing required fields: trainingId, checklistId, memberId and startDate.' 
        });
    }

    // Determine the status based on the provided dates
    let determinedStatus = null;
    if (endDate) {
        determinedStatus = 'Completed';
    }else if (startDate) {
        determinedStatus = 'In Progress';
    }else {
        return res.status(400).json({ 
            error: true, 
            message: 'Must provide either startDate to mark as "In Progress" or endDate to mark as "Completed".' 
        });
    }

    try {
        const fetchQuery = `
            SELECT checklist_assignments_info 
            FROM trainings 
            WHERE id = ?
        `;
        const [results] = await promiseConnection.query(fetchQuery, [trainingId]);

        if (results.length === 0) {
            return res.status(404).json({ error: true, message: `Training ID ${trainingId} not found.` });
        }
        
        const currentJson = results[0].checklist_assignments_info; 
        
        // Safely parse the JSON
        let assignmentsArray;
        try {
            assignmentsArray = currentJson ? JSON.parse(currentJson) : [];
            if (!Array.isArray(assignmentsArray)) {
                assignmentsArray = [];
            }
        } catch (e) {
            console.warn(`JSON parsing error for training ${trainingId}. Resetting assignment array.`, e);
            return res.status(500).json({ error: true, message: 'Failed to parse existing assignment data.' });
        }

        const existingIndex = assignmentsArray.findIndex(item => 
            // Unique key to find the assignment: itemId + memberId
            Number(item.itemId) === Number(checklistId) && Number(item.memberId) === Number(memberId)
        );

        if (existingIndex === -1) {
            return res.status(404).json({ 
                error: true, 
                message: `Assignment for Checklist ID ${checklistId} and Member ID ${memberId} not found in Training ${trainingId}.` 
            });
        }

        const existingAssignment = assignmentsArray[existingIndex];

        let updateFields = {
            status: determinedStatus,
            // Handle optional comments: If provided in body, use it. Otherwise, keep existing.
            comments: comments !== undefined ? comments : existingAssignment.comments || null,
        };

        if (determinedStatus === 'In Progress') {
            updateFields = {
                ...updateFields,
                startDate: startDate, 
                endDate: null,        
                reassignDate: null,
                reassigned: 0
            };
        } else if (determinedStatus === 'Completed') {
            updateFields = {
                ...updateFields,
                endDate: endDate, 
                startDate: existingAssignment.startDate || null,
                reassignDate: null,
                reassigned: 0
            };
        }

        assignmentsArray[existingIndex] = { 
            ...existingAssignment, 
            ...updateFields 
        };

        const updatedJsonString = JSON.stringify(assignmentsArray);

        const updateData = {
            checklist_assignments_info: updatedJsonString
        };
        
        const updateQuery = `
            UPDATE trainings 
            SET ?
            WHERE id = ?
        `;

        await promiseConnection.query(updateQuery, [updateData, trainingId]);

        return res.status(200).json({
            error: false,
            message: `Assignment status successfully updated for Member ${memberId} on Checklist ${checklistId}.`,
            newStatus: determinedStatus,
            assignmentDetails: assignmentsArray[existingIndex]
        });

    } catch (error) {
        console.error('API execution error during assignment status update:', error);
        return res.status(500).json({
            error: true,
            message: `Internal server error: ${error.message}`
        });
    }
};