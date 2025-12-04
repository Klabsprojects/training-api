const connection = require('../db');
const {encrypt, decrypt, customDateFull} = require('../helpers/helper');
const {sendBatchAcc, chkMsg} =require('../helpers/curls');
const {generatePDF} =require('../helpers/pdfgen');

exports.list = (req, res) => {
  const user = req.user;
  const segments = req.params[0].split('/').map(segment => segment.toLowerCase());
  const [type, subject, s_type] = segments;

  let selectColumns = ["id", "name", "staff_id", "mobile", "email", "district", "subject", "s_type", "school", "sch_type"];
  //let whereClauses = ["type = ?"];
  let whereClauses = ["type = ?", "status = 'Active'"];
  let queryParams = [type];  

  if (type == 'hm') {
    whereClauses.push("subject = ?");
    queryParams = ["teacher", "headmaster"];          
  }else if(type == 'teacher') {     
    if (subject && subject !== 'all') {
      whereClauses.push("subject = ?");
      queryParams.push(subject);          
    }else{
      whereClauses.push("subject != ?");
      queryParams.push("headmaster");
    }
  }  

  if (s_type && s_type !== 'all') {
    whereClauses.push("s_type = ?");
    queryParams.push(s_type);          
  }

  const sql = `SELECT ${selectColumns.join(', ')} FROM members ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''}`;  
  connection.query(sql, queryParams, (err, results) => {
    if (err) 
        res.status(500).json({ error: err.message });
    else {
        if (results.length === 0) 
            res.status(404).json({error: true, message: 'Users Not Available' });
        else 
            res.json({error: false, message: type+' List', data:results, user});            
      }
    });
};

exports.create = (req, res) => {
  let data = req.body;
  const user = req.user;
  data.created_by = user.id;
  if(data.type == 'Teacher'){
    const sbj = data.subject.split(".");
    data.s_type = sbj[0];
    data.subject = sbj[1];
  }
  connection.query('INSERT INTO members SET ?', data, (err, results) => {
    if (err) 
      res.status(500).json({ error: err.message, data:data.options });
    else         
      res.json({error: false, message: 'Member added Successfully', data:results, user});      
  });
};

exports.update = (req, res) => {
  let data = req.body;
  const id = req.params.id;
  const user = req.user;
  if(data.type == 'Teacher'){
    const sbj = data.subject.split(".");
    data.s_type = sbj[0];
    data.subject = sbj[1];
  }
  connection.query(`UPDATE members SET ? WHERE id = ${id}`, data, (err, results) => {
    if (err) return res.status(500).json({ error: err.message, data:data.options });
             
    return res.json({error: false, message: 'Member updated Successfully', data:results, user});      
  });
};

exports.getfrm = (req, res) => {
  let type = req.query.type;  
  const usrfrm = decrypt(type);
  let fsql = `SELECT id, type, name, detail, quests, mandatory, expire, if(forms.repeat = 'No', (SELECT if(COUNT(id) > 0, false, true) FROM responses WHERE type = 'Feedback' AND ref = forms.id AND created_by = ${parseInt(usrfrm.substring(0,4))}), true) process FROM forms WHERE id = ?`; //and (expire IS NULL OR expire > now())`;
  let msql = `SELECT id, type, name, staff_id, mobile, email, district, subject FROM members WHERE id = ?`;  

  if(usrfrm.substring(4,5) == '1')
    type = 'FeedBack';
  else if(usrfrm.substring(4,5) == '2'){
    type = 'Training Detail';
    fsql = `SELECT id, type, name, detail, t_start, t_end, school, s_type, subject, sessions, locations, (SELECT group_concat(name) FROM users WHERE Find_in_set(id, trainers)) trainers FROM trainings WHERE id = ?`;
  }
  else if(usrfrm.substring(4,5) == '3'){
    type = 'Orientation';
    fsql = `SELECT id, type, name, detail, t_start, t_end, school, s_type, subject, locations FROM trainings WHERE id = ?`;
  }
  else if(usrfrm.substring(4,5) == '4'){
    type = 'Attendance';
    fsql = `SELECT id, type, name, detail, t_start, t_end, school, s_type, subject, locations FROM trainings WHERE id = ?`;
  }
  else if(usrfrm.substring(4,5) == '5'){
    type = 'Assessment';
    fsql = `SELECT id, type, name, detail, t_start, t_end, school, s_type, subject, locations FROM trainings WHERE id = ?`;
  }else if(usrfrm.substring(4,5) == '6'){
    type = 'Account';
    msql = `SELECT id, type, name, staff_id, mobile, email, district, s_type, subject, acc FROM members WHERE id = ?`;    
    fsql = `SELECT id, type, name, detail, t_start, t_end, locations FROM trainings WHERE id = ?`;
  }else if(usrfrm.substring(4,5) == '7'){
    type = 'Certificate';
    fsql = `SELECT id, type, name, detail, t_start, t_end, school, s_type, subject, locations, (SELECT response FROM responses WHERE ref = trainings.id AND type = 'Pre-Asst' ORDER BY id DESC LIMIT 1) prescr, (SELECT response FROM responses WHERE ref = trainings.id AND type = 'Post-Asst' ORDER BY id DESC LIMIT 1) pstscr FROM trainings WHERE id = ?`;
  }else if(usrfrm.substring(4,5) == '9'){
    type = 'TD-DA';
    fsql = `SELECT id, type, name, detail, t_start, t_end, school, s_type, subject, locations FROM trainings WHERE id = ?`;
  }else if(usrfrm.substring(4,5) == '8'){
    type = 'Materials';
    fsql = `SELECT (SELECT concat(type, ':',name, ':', detail, ':', t_start, ':', t_end) FROM trainings WHERE id = ref) tdata, response FROM responses WHERE id = ?`;
  }

  connection.query(msql, parseInt(usrfrm.substring(0,4)), (err, mem) => {
    if (err) 
      res.status(500).json({ error: err.message });
    else {
      if (mem.length === 0) 
        res.status(404).json({error: true, message: 'Memeber Not Available' });

      // connection.query(fsql, parseInt(usrfrm.substring(5)), (err, frm) => {
      //   if (err) 
      //     res.status(500).json({ error: err.message });
      //   else {
          // if (mem.length === 0) 
          //     res.status(404).json({error: true, message: 'Form not avaialble response' });         
          if (type == 'Training Detail'){
              connection.query(fsql, [parseInt(usrfrm.substring(5))], (err, training) => {  
                if (err) {
                  res.status(500).json({ error: err.message });
                  return;
                }
              res.json({error: false, message: 'Training Data', type, member: mem, training: training});                 
              });                          
          }else if (type == 'Materials'){
              connection.query(fsql, [parseInt(usrfrm.substring(5))], (err, training) => {  
                if (err) return res.status(500).json({ error:true, message: err.message });

                const data = training[0];
                const [ttype, name, detail, start, end] = data.tdata.split(':');
                delete data.tdata;
                data.type = ttype;
                data.name = name;
                data.detail = detail;
                data.start = start;
                data.end = end;                   
                data.materials = JSON.parse(training[0]['response']);
                delete data.response;
                res.json({error: false, message: 'Training Materials', type, member: mem, training: data});                 
              });          
          } else if (type == 'Account'){ 
            connection.query(fsql, [parseInt(usrfrm.substring(5))], (err, training) => {  
              if (err) return res.status(500).json({ error: err.message });
                
              let data = training[0];              
              data.locations = JSON.parse(data.locations);
              mem[0].acc = JSON.parse(mem[0].acc)
              res.json({error: false, message: 'Travel Detail & Account Verification', type, member: mem, training: data});    
            });              
          }else if (type == 'Certificate'){ 
            connection.query(fsql, [parseInt(usrfrm.substring(5))], (err, training) => {  
              if (err) return res.status(500).json({ error: err.message });
                
              const tra = training[0];
              const tscr = {prdata:JSON.parse(tra.prescr), podata:JSON.parse(tra.pstscr)};
              tscr.prscr = tscr.prdata.score.find(entry => entry.id == mem[0].id);   
              tscr.poscr = tscr.podata.score.find(entry => entry.id == mem[0].id);
              // console.log(tscr);
              tra.locations = JSON.parse(tra.locations);
              const period = tra.t_start.toDateString() === tra.t_end.toDateString() ? `on ${customDateFull(tra.t_start)}` : `from ${customDateFull(tra.t_start)} to ${customDateFull(tra.t_end)}`;
              generatePDF(mem[0].name, mem[0].district, tra.name, tra.type, period, 'TNMSTR'+tra.id+mem[0].id, customDateFull(tra.t_end), tra.locations[0].name, tscr)
              .then((filename) => {res.json({error: false, message: 'Training Certificate', type, member: mem, certificate: 'https://training.masclass.in/certificate/'+filename});})
              .catch(error => {
                  console.error("Error generating PDF:", error);
                  res.status(500).json({ error: "Failed to generate PDF" });
              });

            });              
          }else if (type == 'FeedBack'){ 
            // console.log({fsql, id:parseInt(usrfrm.substring(5))})
            connection.query(fsql, [parseInt(usrfrm.substring(5))], (err, form) => {  
              if (err) return res.status(500).json({ error: err.message });

              // let data = training[0];              
              // data.locations = JSON.parse(data.locations);
              // mem[0].acc = JSON.parse(mem[0].acc)
              res.json({error: false, message: 'Public Form', type, member: mem, form});  
            });     
          }else
            res.json({error: false, message: 'Public Form', type, member:mem});
    }
  });  
}

exports.memVerBank = (req, res) => {    
  const ids = req.body.participants;    
  
  sendBatchAcc(ids);
  res.json({error: false, message: 'Bank Verifcation proccesed'});   
}

exports.memcert = async (req, res) => {      
  const filename = await generatePDF('M. Boopathi','Tamil Nadu Government School, Chennai', 'Chennai', 'New Training', 'Full', '01-Feb-2025 to 05-Feb-2025', 'TNMSTR10001');
  res.json({error: false, message: 'Member Certificate', file:'https://training.masclass.in/certificate/'+filename});   
}

exports.TADACal = (req, res) => {
  const {fdate, tdate, distance, location} = req.query;
  const d1 = new Date(fdate);
  const d2 = new Date(tdate);
  
  const data = {from: {ic:0, tc1:0, tc2:0, da:0}, tra: {detail:'', da:0}, to: {ic:0, tc1:0, tc2:0, da:0}}; 
  const diffTime = Math.abs(d2 - d1);  
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if(distance > 149){
    data.from.ic = 150;
    data.from.tc1 = 20;
    data.from.tc2 = 20;
    data.to.ic = 150;
    data.to.tc1 = 20;
    data.to.tc2 = 20;
  }
  if(location == 'Chennai'){
    data.from.da = 75;
    data.tra.detail = days+' days x ₹ 600 x 0.25';
    data.tra.da = days * 600 * 0.25;
  } else{
    data.tra.detail = days+' days x ₹ 300 x 0.25';
    data.tra.da = days * 300 * 0.25;
  }
  return res.json({ error: false, message: 'TA DA data', data});
}

exports.selected = (req, res) => {
  const q_ids = req.query.ids;
  const qIdsArray = Array.isArray(q_ids) ? q_ids : q_ids.split(',');

  const query = "SELECT id, quest, qtype, options FROM quests WHERE id IN (?) ORDER BY FIELD(id, ?);";

  connection.query(query, [qIdsArray, qIdsArray], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });     

    if (results.length === 0) return res.status(404).json({ error: true, message: 'Questions not found for the given IDs' });
    
    results = results.map(result => {
      try {
        result.options = JSON.parse(result.options);
      } catch (e) {
        // If parsing fails, leave options as is (could be an empty array)
        result.options = [];
      }
      return result;
    });
    
    res.json({ error: false, message: 'Selected Questions', data: results});
  });
}

exports.cergen = (req, res) => {
  const q_ids = req.query.ids;
  const qIdsArray = Array.isArray(q_ids) ? q_ids : q_ids.split(',');

  const query = "SELECT id, quest, qtype, options FROM quests WHERE id IN (?);";

  connection.query(query, [qIdsArray], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });     

    if (results.length === 0) return res.status(404).json({ error: true, message: 'Questions not found for the given IDs' });
    
    results = results.map(result => {
      try {
        result.options = JSON.parse(result.options);
      } catch (e) {
        // If parsing fails, leave options as is (could be an empty array)
        result.options = [];
      }
      return result;
    });
    
    res.json({ error: false, message: 'Selected Questions', data: results});
  });
}

exports.memDet = (req, res) => {  
  const user = req.user;
  const id = req.params.id;

  const query = 'SELECT id, type, name, staff_id, mobile, email, district, subject, s_type, e_type FROM `members` WHERE id = ?';

  connection.query(query, id, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });   
    if (results.length === 0) return res.status(404).json({ error: true, message: 'Member not fount' });    
    res.json({ error: false, message: 'Member detail', data: results, user});
  });
}

exports.Rpt = (req, res) => {  
  const user = req.user;
  const id = req.params.id;
  
  const query = 'SELECT id, type, name, detail, t_start, t_end, sessions FROM `trainings` WHERE find_in_set(?, participants)';

  connection.query(query, id, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });   
    if (results.length === 0) return res.status(404).json({ error: true, message: 'Member Training not found' });    
    results.forEach(row =>{
      row.sessions = JSON.parse(row.sessions);
    });
    res.json({ error: false, message: 'Member Training detail', data: results, user});
  });
}

exports.chk = (req, res) => {
  // const params = {numbers: '919443826092,919789993636', message: 'Test Message, multiple'};
  // sendBatchTraining(params, (err, results) => { if (err) console.error('Error sending messages:', err.message); else console.log('Messages sent successfully:', results);});
  // res.json({ success: true, message: 'Record created and messages are being sent.' });
  // const original = req.query.data;

  // const encrypted = encrypt(original);  
  // const decrypted = decrypt(original);
  // res.json({error: false, encrypted, decrypted});

  chkMsg('id');
  res.json({error: false, message: 'Bank Verifcation proccesed'});  
}
