
const connection = require('../db');
const {PeriodRange} = require('../helpers/helper');
require('dotenv').config();

// const DB_HOST = process.env.DB_HOST;
// const DB_USER = process.env.DB_USER;
// const DB_PASS = process.env.DB_PASS;
// const DB_NAME = process.env.DB_NAME;

  exports.list = (req, res) => {
    const type = req.params.type;
    const user = req.user;
    let whereClauses = ["status = ?"];
    let queryParams = ["Active"]; 
    if (type && type !== 'all'){
      whereClauses.push("role = ?");
      queryParams.push(type); 
    }
    connection.query(`SELECT id, name, username, mobile, email, role, resp, notes, profile_file FROM users ${whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''}`, queryParams, (err, results) => {
      if (err) 
          res.status(500).json({ error: err.message });
      else { 
          if (results.length === 0) 
              res.status(404).json({error: true, message: 'Users Not Available' });
          else {
                  res.json({error: false, message: 'User List', data:results});
            }
        }
      });
  };

  exports.login = (req, res) => {
    const jwt = require('jsonwebtoken');
    const {username, password} = req.body;
    connection.query('SELECT id, name, username, pass, mobile, role FROM users where username = ?', [username], (err, user) => {
      if (user.length === 0)
        return res.status(404).json({ error: 'Invalid username or password'});
      if (password != user[0].pass)
          return res.status(404).json({ error: 'Invalid username or password'});     
        
      delete user[0].pass;
      const secretKey = 'T@3Fo@l0g';
      const authToken = jwt.sign(user[0], secretKey, { expiresIn: '1h' });
      res.json({error: false, message: 'Login Success', data:user[0], authToken});
    });
  };

  exports.home = (req, res) => {
    const user = req.user;
    let qry =  "";
    if (user['role'] == 'Trainer')      
      qry = "SELECT group_concat(distinct type) types, group_concat(distinct name) names, sum(if(t_end < now(), 1, 0)) completed, sum(if(now() between t_start and t_end, 1, 0)) ongoing, sum(if(t_start > now(), 1, 0)) upcoming FROM `trainings` WHERE find_in_set(?, trainers)";
    else if (user['role'] == 'Support')
      qry = "SELECT group_concat(distinct type) types, group_concat(distinct name) names, sum(if(t_end < now(), 1, 0)) completed, sum(if(now() between t_start and t_end, 1, 0)) ongoing, sum(if(t_start > now(), 1, 0)) upcoming FROM `trainings` WHERE find_in_set(?, associates)";
    else
      qry = "SELECT concat(group_concat(type,':', name)) names, sum(if(t_end < now(), 1, 0)) completed, sum(if(now() between t_start and t_end, 1, 0)) ongoing, sum(if(t_start > now(), 1, 0)) upcoming FROM `trainings`";
  
    connection.query(qry, [user.id], (err, results) => {
      if (err) 
          res.status(500).json({ error: err.message });
      else {
          if (results.length === 0) 
              res.status(404).json({error: true, message: 'Having issue' });
          else {
            const groupedData = {};

            results[0].names.split(',').forEach(entry => {
              const [key, value] = entry.split(':').map(s => s.trim());
              if (key && value) {if (!groupedData[key]) groupedData[key] = []; groupedData[key].push(value);}
            });
            results[0].trainings = groupedData;
            delete results[0].names;

            // const Rdata = [{ Region: "Palaru", District: "TIRUVALLUR" },  { Region: "Palaru", District: "KANCHEEPURAM" },  { Region: "Palaru", District: "CHENNAI" },  { Region: "Palaru", District: "CHENGALPATTU" },  { Region: "Yelagri", District: "KRISHNAGIRI" },  { Region: "Yelagri", District: "TIRUPATTUR" },  { Region: "Yelagri", District: "VELLORE" },  { Region: "Yelagri", District: "RANIPET" },  { Region: "Neythal", District: "TIRUVANNAMALAI" },  { Region: "Neythal", District: "CUDDALORE" },  { Region: "Neythal", District: "MAYILADUTHURAI" },  { Region: "Neythal", District: "VILLUPURAM" },  { Region: "Yerucad", District: "DHARMAPURI" },  { Region: "Yerucad", District: "KALLAKURICHI" },  { Region: "Yerucad", District: "NAMAKKAL" },  { Region: "Yerucad", District: "PERAMBALUR" },  { Region: "Yerucad", District: "SALEM" },  { Region: "Cauvery", District: "ARIYALUR" },  { Region: "Cauvery", District: "NAGAPATTINAM" },  { Region: "Cauvery", District: "THANJAVUR" },  { Region: "Cauvery", District: "TIRUCHIRAPPALLI" },  { Region: "Cauvery", District: "TIRUVARUR" },  { Region: "Kurinj", District: "COIMBATORE" },  { Region: "Kurinj", District: "ERODE" },  { Region: "Kurinj", District: "THE NILGIRIS" },  { Region: "Kurinj", District: "TIRUPPUR" },  { Region: "Vaigai", District: "DINDUGAL" },  { Region: "Vaigai", District: "KARUR" },  { Region: "Vaigai", District: "MADURAI" },  { Region: "Vaigai", District: "PUDUKKOTTAI" },  { Region: "Marutham", District: "RAMANATHAPURAM" },  { Region: "Marutham", District: "SIVAGANGAI" },  { Region: "Marutham", District: "THENI" },  { Region: "Marutham", District: "VIRUDHUNAGAR" },  { Region: "Porunai", District: "KANNIYAKUMARI" },  { Region: "Porunai", District: "TENKASI" },  { Region: "Porunai", District: "THOOTHUKUDI" },  { Region: "Porunai", District: "TIRUNELVELI" }];
            // const grouped = {};
            // Rdata.forEach(item => {if (!grouped[item.Region]) grouped[item.Region] = [];  grouped[item.Region].push(item.District);});            
            results[0].regions = {"Palaru": ["TIRUVALLUR", "KANCHEEPURAM", "CHENNAI", "CHENGALPATTU"], "Yelagri": ["KRISHNAGIRI", "TIRUPATHUR", "VELLORE", "RANIPET"], "Neythal": ["TIRUVANNAMALAI", "CUDDALORE", "MAYILADUTHURAI", "VILLUPURAM"], "Yerucad": ["DHARMAPURI", "KALLAKURICHI", "NAMAKKAL", "PERAMBALUR", "SALEM"], "Cauvery": ["ARIYALUR", "NAGAPATTINAM", "THANJAVUR", "TIRUCHIRAPPALLI", "TIRUVARUR"], "Kurinj": ["COIMBATORE", "ERODE", "THE NILGIRIS", "TIRUPPUR"], "Vaigai": ["DINDUGAL", "KARUR", "MADURAI", "PUDUKKOTTAI"], "Marutham": ["RAMANATHAPURAM", "SIVAGANGAI", "THENI", "VIRUDHUNAGAR"], "Porunai": ["KANNIYAKUMARI", "TENKASI", "THOOTHUKUDI", "TIRUNELVELI"]};
            results[0].school = ["Tamilnadu Model School"];
            res.json({error: false, message: 'Home Data', data:results, user});
          }
        }
      });
  };

  exports.FltData = (req, res) => {
    const user = req.user;
    const {status, training, region,  district} = req.query;
    let selectColumns = ["t.id", "t.type", "t.name", "t_start",	"t_end", "t.school", "t.subject", "sessions", "locations", "participants"]; 
    let whereClauses = ["t.status = 'Active'"];
    if (status && status !== 'all'){ 
      if(status == 'Completed') whereClauses.push(`t_end < now()`);
      if(status == 'Upcoming') whereClauses.push(`t_start > now()`);
    }
    if (user.role == 'Team')      
      whereClauses.push(`t.created_by = ${user.id}`);
    if (training && training !== 'all' && training !== '')
      whereClauses.push(`t.type = '${training}'`);
    
    if(district && district !== 'all')
      whereClauses.push(`district = '${district}'`);
    else if(region && region !== 'all'){
      const regionMap = {"Palaru": ["TIRUVALLUR", "KANCHEEPURAM", "CHENNAI", "CHENGALPATTU"], "Yelagri": ["KRISHNAGIRI", "TIRUPATHUR", "VELLORE", "RANIPET"], "Neythal": ["TIRUVANNAMALAI", "CUDDALORE", "MAYILADUTHURAI", "VILLUPURAM"], "Yerucad": ["DHARMAPURI", "KALLAKURICHI", "NAMAKKAL", "PERAMBALUR", "SALEM"], "Cauvery": ["ARIYALUR", "NAGAPATTINAM", "THANJAVUR", "TIRUCHIRAPPALLI", "TIRUVARUR"], "Kurinj": ["COIMBATORE", "ERODE", "THE NILGIRIS", "TIRUPPUR"], "Vaigai": ["DINDUGAL", "KARUR", "MADURAI", "PUDUKKOTTAI"], "Marutham": ["RAMANATHAPURAM", "SIVAGANGAI", "THENI", "VIRUDHUNAGAR"], "Porunai": ["KANNIYAKUMARI", "TENKASI", "THOOTHUKUDI", "TIRUNELVELI"]};
      const districts = regionMap[region];
      const inClause = districts.map(d => `'${d}'`).join(', ');
      whereClauses.push(`district IN (${inClause})`);
    }


    selectColumns.push(`group_concat(concat('{"id":',m.id,',"name":"',m.name,'","mobile":"',mobile,'","district":"',district,'","subject":"',ifnull(m.s_type,'PG'),"-",m.subject,'","e_type":"',e_type,'","school":"Taminadu Model School"}')) member`);
    selectColumns.push(`(SELECT group_concat('"', JSON_UNQUOTE(JSON_EXTRACT(response, '$.participants')),'"') FROM responses WHERE type = 'attendance' AND ref = t.id) att`);
    selectColumns.push("(SELECT group_concat(distinct created_by) FROM responses WHERE type = 'RSVP' AND ref = t.id) rsvp");
    // selectColumns.push(`if(type = 'ACADEMIC TRAINING', ifnull((SELECT JSON_UNQUOTE(JSON_EXTRACT(response, '$.score')) FROM responses WHERE type = 'Pre-Asst' AND ref = trainings.id  limit 1),0),0) preasst`);
    // selectColumns.push(`if(type = 'ACADEMIC TRAINING', ifnull((SELECT JSON_UNQUOTE(JSON_EXTRACT(response, '$.score')) FROM responses WHERE type = 'Post-Asst' AND ref = trainings.id limit 1),0),0) postasst`);

    qry = `SELECT ${selectColumns.join(', ')} FROM trainings t LEFT JOIN members m ON FIND_IN_SET(m.id, t.participants) WHERE ${whereClauses.join(' AND ')} GROUP by t.id`;
   
    connection.query(qry, (err, results) => {
      if (err) return res.status(500).json({ error: err });
      if (results.length === 0) return res.status(404).json({ error: true, message: 'Training Not Available' });

      let allMembers = [];
      let invited = 0, accepted = 0, sessions = 0;
      const districtMap = new Map();
      const subjectMap = new Map();

      results.forEach(row => {
        row.school = safeParse(row.school);
        row.subject = safeParse(row.subject);
        row.sessions = safeParse(row.sessions);
        row.member = safeParse('[' + row.member + ']');
        row.att = row.att ? safeParse('[' + row.att + ']') : [];

        // Attendance intersection
        if (row.att.length > 0) {
          const sets = row.att.map(a => new Set(a.split(',')));
          row.att = intersectSets(sets);
        }
        // Append members
        allMembers.push(...row.member);
        sessions += row.sessions.length;

        // RSVP & Participants filtering
        // const allowedIds = new Set(row.member.map(m => String(m.id)));
        const allowedIds = new Set( (row.member || []).filter(m => m && m.id !== undefined).map(m => String(m.id)));

        const partIds = (row.participants || '').split(',').map(s => s.trim()).filter(Boolean);
        invited += partIds.filter(id => allowedIds.has(id)).length;

        const rsvpIds = (row.rsvp || '').split(',').map(s => s.trim()).filter(Boolean);
        accepted += rsvpIds.filter(id => allowedIds.has(id)).length;

        // Clean up heavy fields
        delete row.member;
        delete row.participants;
        delete row.att;
      });

      // Final attendance count
      const allowedSet = new Set(allMembers.map(m => String(m.id)));      
      const attendance = results.flatMap(row => row.att || []).filter(id => allowedSet.has(id)).length;

      // District-wise & Subject-wise count
      allMembers.forEach(member => {
        const dist = (member.district || '').toLowerCase().trim();
        if (dist) districtMap.set(dist, (districtMap.get(dist) || 0) + 1);

        const sbj = member.subject || '';
        if (sbj) subjectMap.set(sbj, (subjectMap.get(sbj) || 0) + 1);
      });

      const chartData1 = Array.from(districtMap.entries()).map(([district, count]) => ({ district, count }));
      const chartData2 = Array.from(subjectMap.entries()).map(([subject, count]) => ({ subject, count }));

      const avg_att = invited > 0 ? (attendance / invited * 100).toFixed(2) : '0.00';

      return res.json({error: false, message: 'Training Data', data: {invited, accepted, attendance, avg_att, sessions, trainings: results, members: allMembers, dist_mem: chartData1, sbj_mem: chartData2 }, user});
    });
  };

function intersectSets(sets) {
  return [...sets.reduce((a, b) => new Set([...a].filter(x => b.has(x))))];
}
  
function safeParse(data, fallback = []) {
  try {
    return JSON.parse(data || '[]');
  } catch {
    return fallback;
  }
}

  exports.TraData = (req, res) => {
    const user = req.user;
    const {status, training, period} = req.query;
    
    let selectColumns = ["t.id", "t.type", "t.name", "t_start",	"t_end", "sessions", "topic_covered"]; let whereClauses = ["t.id > 113", "t.status = 'Active'"]; //"t.id in (107, 113)", 
    if (status && status !== 'all'){ 
      if(status == 'completed') whereClauses.push(`t_end < now()`);
      if(status == 'Upcoming') whereClauses.push(`t_start > now()`);
    }
    if (training && training !== 'all' && training !== '')
      whereClauses.push(`type = '${training}'`);
    if (user.role == 'Team')      
      whereClauses.push(`t.created_by = ${user.id}`);

    if (period) {
      if (period.includes(':')){
        const [startDate, endDate] = period.split(':');
        whereClauses.push(`DATE(t_start) BETWEEN '${startDate}' AND '${endDate}'`);      
      }else{
        let {startDate, endDate} = PeriodRange(period);
        whereClauses.push(`DATE(t_start) BETWEEN '${startDate}' AND '${endDate}'`);     
      } 
    }

    selectColumns.push(`group_concat(concat('{"id":',m.id,',"name":"',m.name,'","staff_id":"',staff_id,'","mobile":"',mobile,'","district":"',district,'","subject":"',ifnull(m.s_type,'PG'),"-",m.subject,'","e_type":"',e_type,'","school":"Taminadu Model School"}')) member`);
    selectColumns.push(`(SELECT group_concat('"', JSON_UNQUOTE(JSON_EXTRACT(response, '$.participants')),'"') FROM responses WHERE type = 'attendance' AND ref = t.id) att`);
    selectColumns.push("(SELECT group_concat(distinct created_by) FROM responses WHERE type = 'RSVP' AND ref = t.id) rsvp");
    selectColumns.push("(SELECT group_concat(distinct created_by) FROM responses WHERE type = 'Account') tada"); // AND ref = t.id
    selectColumns.push(`(SELECT response FROM responses WHERE id = (SELECT max(id) FROM responses WHERE type = 'Pre-Asst' AND ref = t.id)) preasst`);
    selectColumns.push(`(SELECT response FROM responses WHERE id = (SELECT max(id) FROM responses WHERE type = 'Post-Asst' AND ref = t.id)) postasst`);
    
    qry = `SELECT ${selectColumns.join(', ')} FROM trainings t LEFT JOIN members m ON m.id > 51 AND FIND_IN_SET(m.id, t.participants) WHERE ${whereClauses.join(' AND ')} GROUP by t.id`;
    connection.query(qry, (err, results) => {
      if (err) return res.status(500).json({ error: err });
      if (results.length === 0) return res.status(404).json({error: true, message: 'Training Not Available' });

      const allMembers = []; const allTrainings = [];
      results.forEach(row => {
        row.sessions = row.sessions ? JSON.parse(row.sessions) : [];
        row.member = JSON.parse('[' + row.member + ']');        
        row.att = row.att ? safeParse('[' + row.att + ']') : [];
        row.preasst = row.preasst ? JSON.parse(row.preasst) : [];
        row.postasst = row.postasst ? JSON.parse(row.postasst) : [];    
        let pData = summarizeMemebrs(row);    
        allMembers.push(...pData);
        pData = summarizeTraining(row);
        allTrainings.push(pData);
      });
      
      return res.json({ error: false, message: 'Training Data', data: {members:allMembers, training:allTrainings}, user });
    });
  };

  function summarizeMemebrs(training) {
    const rsvpIds = training.rsvp ? training.rsvp.split(',').map(id => parseInt(id)) : [];
    const tadaIds = training.tada ? training.tada.split(',').map(id => parseInt(id)).filter(id => rsvpIds.includes(id)) : [];
    const attIds = training.att ? training.att.flatMap(a => a.split(',').map(id => parseInt(id))) : [];
    // const preMap = Object.fromEntries(training.preasst.map(p => [parseInt(p.id), parseFloat(p.pre)]));
    // const postMap = Object.fromEntries(training.postasst.map(p => [parseInt(p.id), parseFloat(p.post)]));
    const region = {"TIRUVALLUR":"Palaru","KANCHEEPURAM":"Palaru","CHENNAI":"Palaru","CHENGALPATTU":"Palaru","KRISHNAGIRI":"Yelagri","TIRUPATHUR":"Yelagri","VELLORE":"Yelagri","RANIPET":"Yelagri","TIRUVANNAMALAI":"Neythal","CUDDALORE":"Neythal","MAYILADUTHURAI":"Neythal","VILLUPURAM":"Neythal","DHARMAPURI":"Yerucad","KALLAKURICHI":"Yerucad","NAMAKKAL":"Yerucad","PERAMBALUR":"Yerucad","SALEM":"Yerucad","ARIYALUR":"Cauvery","NAGAPATTINAM":"Cauvery","THANJAVUR":"Cauvery","TIRUCHIRAPPALLI":"Cauvery","TIRUVARUR":"Cauvery","COIMBATORE":"Kurinj","ERODE":"Kurinj","THE NILGIRIS":"Kurinj","TIRUPPUR":"Kurinj","DINDUGAL":"Vaigai","KARUR":"Vaigai","MADURAI":"Vaigai","PUDUKKOTTAI":"Vaigai","RAMANATHAPURAM":"Marutham","SIVAGANGAI":"Marutham","THENI":"Marutham","VIRUDHUNAGAR":"Marutham","KANNIYAKUMARI":"Porunai","TENKASI":"Porunai","THOOTHUKUDI":"Porunai","TIRUNELVELI":"Porunai" };
    const preMap = training.preasst ? buildAssessmentMap(training.preasst, 'pre') : {};
    const postMap = training.postasst ? buildAssessmentMap(training.postasst, 'post') : {};
    // console.log(training);
    const memberData = training.member.map(member => {
      const id = member.id;
      const attendanceCount = attIds.filter(i => i === id).length;

      return {...member, region: region[member.district] || member.district, t_id: training.id, t_type: training.type, t_name: training.name, accepted: rsvpIds.includes(id) ? 1 : 0, tada: tadaIds.includes(id) ? 1 : 0, attendance: attendanceCount, "pre-asst": preMap[id] || 0, "post-asst": postMap[id] || 0 };
    });

    return memberData;
  }

  function summarizeTraining(training) {
    const totalSessions = training.sessions?.length || 0;
    const totalRSVP = training.rsvp?.split(',').length || 0;

    const preScores = [];//training.preasst?.map(a => parseFloat(a.pre)) || [];
    const avgPre = preScores.length ? (preScores.reduce((sum, val) => sum + val, 0) / preScores.length).toFixed(2) : '0.00';

    // Average Post-assessment
    const postScores = [];//training.postasst?.map(a => parseFloat(a.post)) || [];
    const avgPost = postScores.length ? (postScores.reduce((sum, val) => sum + val, 0) / postScores.length).toFixed(2) : '0.00';

    // Attendance: Count of members who attended ALL sessions
    const sessionAttendance = training.att || [];
    const fullyAttended = {};
    sessionAttendance.forEach(session => {
      session.split(',').forEach(id => {
        fullyAttended[id] = (fullyAttended[id] || 0) + 1;
      });
    });

    const fullAttendanceCount = Object.values(fullyAttended).filter(count => count === totalSessions).length;

    return {id: training.id, type: training.type, name: training.name, start: training.t_start,	end: training.t_end, sessions: totalSessions, total_rsvp: totalRSVP, avg_preasst: avgPre, avg_postasst: avgPost, fully_attended: fullAttendanceCount };
  }

  function buildAssessmentMap(responseStr, key) {
    const result = {};
    const data = typeof responseStr === 'string' ? JSON.parse(responseStr) : responseStr;
    const total = parseFloat(data.total || 0);

    if (total > 0 && Array.isArray(data.score)) {
      data.score.forEach(item => {
        const id = parseInt(item.id);
        const mark = parseFloat(item[key] || 0);
        if (!isNaN(mark)) {
          result[id] = parseFloat(((mark / total) * 100).toFixed(0));
        }
      });
    }

    return result;
  }

  exports.logout = (req, res) => {
      res.json({error: false, message: 'Logout Sucessfuly'});            
  };
  
  exports.create = (req, res) => {
    const data = req.body;
    const user = req.user;
    const usr = {...data, created_by: user.id };
  
    connection.query('INSERT INTO users SET ?', usr, (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({error: false, message: 'User Detail added successfully', id: results.insertId, user});
      }
    });
  };

  exports.update = (req, res) => {  
      const id = req.params.id;
      const data = req.body;
      const user = req.user;

      connection.query('UPDATE users SET ? WHERE id = ?', [data, id], (err) => {
        if (err) 
          res.status(500).json({ error: err.message });
        else 
            res.json({error: false, message: 'User Detail Updated', user});
      });
  };
