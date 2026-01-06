const connection = require('../db');
const {sendMemMsg, sendTrainingTadaMsg} =require('../helpers/curls');
const {amtwrds} = require('../helpers/helper');

exports.smtfrm = async (req, res) => {
    let data = req.body;
    const user = req.user;

    data.response = JSON.stringify(data.response); 
    
    connection.query('INSERT INTO responses SET ?', data, (err, results) => {
      if (err) 
        res.status(500).json({ error: err.message });
      else 
        if(data.type == 'rsvp' && data.response == '"Yes"'){ 
          const params = {type:'TA-DA', id:data.created_by, uid:data.created_by, tid:data.ref};
          sendMemMsg(params);
          return res.json({error: false, message: 'Submitted Successfully', data:results, user});  
        }
        else if(data.type == 'rstr' && data.response == '"Yes"'){
          const params = {type:'TA-DA', id:data.created_by, uid:data.created_by, tid:data.ref};
          sendTrainingTadaMsg(params);
          return res.json({error: false, message: 'Submitted Successfully', data:results, user});
        }
        else if(data.type == 'Account'){
          const {fromDateTm, rj_toDateTm, distance, toTrvl, fare = 0, rj_fare = 0} = JSON.parse(data.response);
          const famt = parseFloat(fare) + parseFloat(rj_fare);
          let [dmy, time, meridian] = fromDateTm.split(" ");
          let [day, month, year] = dmy.split("-").map(Number);
          let [hours, minutes] = time.split(":").map(Number);
          if (meridian === "PM" && hours !== 12) hours += 12;
          if (meridian === "AM" && hours === 12) hours = 0;
          const d1 = new Date(year, month - 1, day, hours, minutes);
          [dmy, time, meridian] = rj_toDateTm.split(" ");
          [day, month, year] = dmy.split("-").map(Number);
          [hours, minutes] = time.split(":").map(Number);
          if (meridian === "PM" && hours !== 12) hours += 12;
          if (meridian === "AM" && hours === 12) hours = 0;
          const d2 = new Date(year, month - 1, day, hours, minutes);
          let tamt = famt;
          
          data = {from: {ic:0, tc1:0, tc2:0, da:0}, tra: {detail:'', da:0}, to: {ic:0, tc1:0, tc2:0, da:0}}; 
          const diffTime = Math.abs(d2 - d1);  
          const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if(distance > 149){
            data.from.ic = 150;
            data.from.tc1 = 20;
            data.from.tc2 = 20;
            data.to.ic = 150;
            data.to.tc1 = 20;
            data.to.tc2 = 20;
            tamt += 380;
          }
          
          if(toTrvl == 'Chennai'){
            data.from.da = 75;
            data.tra.detail = days+' days x ₹ 600 x 0.25';
            data.tra.da = days * 600 * 0.25;
            tamt = tamt + (days * 600 * 0.25) + 75;            
          } else{
            data.tra.detail = days+' days x ₹ 300 x 0.25';
            data.tra.da = days * 300 * 0.25;
            tamt = tamt + (days * 600 * 0.25);
          }
          console.log('Initial tamt:', tamt, typeof tamt);
          data.amount = amtwrds(tamt);
          console.log({tamt, data});
          return res.json({error: false, message: 'Submitted Successfully', data, user});
        }
        else
          return res.json({error: false, message: 'Submitted Successfully', data:results, user});      
    }); 
};

exports.getbyId = async (req, res) => {
    const user = req.user;    
    connection.query("SELECT r.`id`, r.`type`, r.`response`, r.`created_at`, r.`created_by`, m.`type`, `name`, `staff_id`, `mobile`, `email`, `district`, `subject`, `e_type` FROM `responses` r inner join `members` m ON m.id = r.created_by", (err, results) => {
      if (err) 
          res.status(500).json({ error: err.message });
      else {
          if (results.length === 0) 
              res.status(404).json({error: true, message: 'Feedback Not Available' });
          else{ 
            results[0].response = JSON.parse(results[0].response); 
            res.json({error: false, message: 'Feedback Detail', data:results[0], user});   
          }         
        }
      });
};

exports.list = async (req, res) => {
    const user = req.user;
    const type = req.params.type;
    connection.query("SELECT r.`id`, r.`type`, r.`created_at`, r.`created_by`, m.`type`, `name`, `staff_id`, `mobile`, `email`, `district`, `subject` FROM `responses` r inner join `members` m ON m.id = r.created_by WHERE r.status = 'Active' and r.type = ?", type, (err, results) => {
      if (err) 
          res.status(500).json({ error: err.message });
      else {
          if (results.length === 0) 
              res.status(404).json({error: true, message: 'Feedback Not Available' });
          else {
                  res.json({error: false, message: 'Feedback List', data:results, user});
            }
        }
      });
};