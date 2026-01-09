const connection = require('../db');

const {encrypt} = require('../helpers/helper');

// const https = require('https');

const axios = require('axios');

// const url = `http://wapp.powerstext.in/http-tokenkeyapi.php`;

const url = `https://int.chatway.in/api/send-msg`;

const queryParams = {username:'Indianklabs', 'token':'Sk42QU00b1lLQ0RQcGxnbURKcVdJdz09'};

// const queryParams = {route:'1', 'authentic-key':'3636496e6469616b6c6162737340676d61696c2e636f6d3130301748676702'};

const Murl = `https://mediaapi.smsgupshup.com/GatewayAPI/rest`;

const MqueryParams = {userid: '2000245833', password: 'BnCb7p!b', method:'SENDMESSAGE', v: '1.1', format:'json', msg_type:'TEXT', send_to:'9789993636'};





function sendWHBatch(params) {   

    const {type, ids, fid, uid} = params;

    const usrs = ids ? (Array.isArray(ids) ? ids : ids.split(',')) : [];

    let query = `SELECT id, mobile, (SELECT concat((SELECT concat('*',name, '* - ', type ) FROM trainings WHERE id = ref), ' *',JSON_UNQUOTE(JSON_VALUE(response, '$.name')),'*') FROM responses WHERE id = ${fid}) title FROM members WHERE id IN (${usrs.join(',')})`;    

    if(type == 'Form')

        query = `SELECT id, mobile, (SELECT if(type != 'Training', concat(name, ' ', type), concat((SELECT concat(type, ' ',name) FROM trainings WHERE id = ref), ' ',name)) FROM forms WHERE id = ${fid}) title FROM members WHERE id IN (${usrs.join(',')})`;



    connection.query(query, (error, results) => {

        const userDetails = results.map((user) => ({number: user.mobile, title: user.title, id: user.id}));

        userDetails.forEach(({ id, number, title }) => {

            queryParams.number = '91' + number;

            if(type == 'Form')

                queryParams.message =  `*TNGMS* requested you to update, \n*${title}* \nform on this link, https://mem.masclass.in/${encrypt(id.toString().padStart(4, '0') + '1' + fid.toString().padStart(4, '0'))} \n\nThank You`;

            else if(type == 'Material')

                queryParams.message =  `*TNGMS* shared you, \n${title} \nget from this link, https://mem.masclass.in/${encrypt(id.toString().padStart(4, '0') + '8' + fid.toString().padStart(4, '0'))} \n\nThank You`;

           

            return axios.get(url, { params: queryParams })

            .then((response) => {

                const logContent = JSON.stringify({message: queryParams.message, response: response.data[0]});

                connection.query(`INSERT INTO requests (type, ref, receiver, content, created_by) VALUES (?, ?, ?, ?, ?)`, [type, fid, id, logContent, uid]);

                console.log(`Message sent to ${number}:`, response.data);                

            })

            .catch((error) => {                

                const logContent = JSON.stringify({message: queryParams.message, error: error.message, stack: error.stack});

                connection.query(`INSERT INTO requests (type, ref, receiver, content, created_by) VALUES (?, ?, ?, ?, ?)`, [type, fid, id, logContent, uid]);

                console.error(`Error sending message to ${number}:`, error.message,url, { params: queryParams });

            });

        });

    });

}



function sendBatchTraining(params) {   

    const { ids, tid, tname, typ, detail, cdate, location, uid} = params;

    const usrs = ids ? (Array.isArray(ids) ? ids : ids.split(',')) : [];

    const query = `SELECT id, mobile, name FROM members WHERE id IN (${usrs.join(',')})`;

    

    connection.query(query, (error, results) => {



        const userDetails = results.map((user) => ({number: user.mobile, title: user.title, id: user.id}));

        userDetails.forEach(({ id, number, name }) => {

            queryParams.number = '91' + number;

            // MqueryParams.send_to = number;

            queryParams.message = `*${tname}* new training planned \n\n${detail}\n\n *Date* :${cdate}\n\n *Location* : ${location}\n\n Please, confirm your participant *Register* from this link, https://mem.masclass.in/${encrypt(id.toString().padStart(4, '0') + '2' + tid.toString().padStart(4, '0'))}`;

            // MqueryParams.msg = `Greetings+from+Tamil+Nadu+Model+Schools.%0A%0AYou+are+invited+to+attend+the++${detail}+scheduled+on+${cdate}++at++state+.+Please+find+the+training+details+below%3A%0A%0ATraining+Location%3A+${location}%2F%0A%0ARegistration+Link%3A+https://mem.masclass.in/${encrypt(id.toString().padStart(4, '0') + '2' + tid.toString().padStart(4, '0'))}%2F%0A%0AWe+look+forward+to+your+participation.%0A%0AWarm+regards%2C%0ATamil+Nadu+Model+Schools+Training+Team`;

            MqueryParams.msg = `Greetings+from+Tamil+Nadu+Model+Schools.%0A%0AYou+are+invited+to+attend+the++Academic+Training+Certificate+Test+Purpose+scheduled+on+Thu%2C+27th+Mar+2025++at++Thu%2C+27th+Mar+2025+.+Please+find+the+training+details+below%3A%0A%0ATraining+Location%3A+https%3A%2F%2Fmaps.app.goo.gl%2F8Fuzy8h6itkMnX26A%0A%0ARegistration+Link%3A+https%3A%2F%2Fmem.masclass.in%2F%2Fbbbhdbcce%0A%0AWe+look+forward+to+your+participation.%0A%0AWarm+regards%2C%0ATamil+Nadu+Model+Schools+Training+Team`;

            // return axios.get(Murl, { params: MqueryParams })

            return axios.get(url, { params: queryParams })

            .then((response) => {

                const logContent = JSON.stringify({message: queryParams.message, response: response.data[0]});

                connection.query(`INSERT INTO requests (type, ref, receiver, content, created_by) VALUES ('Train-Par', ?, ?, ?, ?)`, [tid, id, logContent, uid]);

                console.log(`Message sent to ${number}`, response);

            })

            .catch((error) => {

                const logContent = JSON.stringify({message: queryParams.message, error: error.message, stack: error.stack});

                connection.query(`INSERT INTO requests (type, ref, receiver, content, created_by) VALUES ('Train-Par', ?, ?, ?, ?)`, [tid, id, logContent, uid]);

                // console.log(error);

                console.error(`Error sending message to ${number}`, error.message);                

            });

        });

    });

}



function sendMemMsg(params) {   

    const {type, id, uid, tid } = params;

    const query = `SELECT mobile, name FROM members WHERE id = (${uid})`;



    connection.query(query, (error, results) => {

        queryParams.number = '91' + results[0].mobile;

        queryParams.message =  `Dear *${results[0].name}*, \n\n*TNGMS* requested you to update TA-DA detail and Bank A/c confirmation on this link, https://mem.masclass.in/${encrypt(uid.toString().padStart(4, '0') + '6' + tid.toString().padStart(4, '0'))} \nYou will get PDF after form submission, take print and submit while attending training.  \n\nThank You`;        

            

        return axios.get(url, {params: queryParams })

        .then((response) => {

            const logContent = JSON.stringify({message: queryParams.message, response: response.data[0]});

            connection.query(`INSERT INTO requests (type, ref, receiver, content, created_by) VALUES ('Mem-TADA', ?, ?, ?, ?)`, [tid, id, logContent, uid]);

            // console.log(`Message sent to ${queryParams.number}:`, response.data);

        })

        .catch((error) => {

            const logContent = JSON.stringify({message: queryParams.message, error: error.message, stack: error.stack});

            connection.query(`INSERT INTO requests (type, ref, receiver, content, created_by) VALUES ('MEM-TADA', ?, ?, ?, ?)`, [tid, id, logContent, uid]);

            console.error(`Error sending message to ${queryParams.number}:`);//, error.message);

        });

    });

}

function sendTrainingTadaMsg(params) {   

    const {type, id, uid, tid } = params;

    const query = `SELECT mobile, name FROM users WHERE id = (${uid})`;



    connection.query(query, (error, results) => {

        queryParams.number = '91' + results[0].mobile;

        queryParams.message =  `Dear *${results[0].name}*, \n\n*TNGMS* requested you to update TA-DA detail and Bank A/c confirmation on this link, https://mem.masclass.in/${encrypt(uid.toString().padStart(4, '0') + 'b' + tid.toString().padStart(4, '0'))} \nYou will get PDF after form submission, take print and submit while attending training.  \n\nThank You`;        

            

        return axios.get(url, {params: queryParams })

        .then((response) => {

            const logContent = JSON.stringify({message: queryParams.message, response: response.data[0]});

            connection.query(`INSERT INTO requests (type, ref, receiver, content, created_by) VALUES ('Tra-TADA', ?, ?, ?, ?)`, [tid, id, logContent, uid]);

            console.log(`Message sent to ${queryParams.number}:`, response.data);

        })

        .catch((error) => {

            const logContent = JSON.stringify({message: queryParams.message, error: error.message, stack: error.stack});

            connection.query(`INSERT INTO requests (type, ref, receiver, content, created_by) VALUES ('Tra-TADA', ?, ?, ?, ?)`, [tid, id, logContent, uid]);

            console.error(`Error sending message to ${queryParams.number}:`);//, error.message);

        });

    });

}

function sendTrainermsg(params) {   

    const {id, tid, tname, typ, detail, cdate, location, uid } = params;

    const query = `SELECT id, mobile, name FROM users WHERE id = (${id})`;



    connection.query(query, (error, results) => {

        queryParams.number = '91' + results[0].mobile;

        queryParams.message = `*${typ}${tname}* new training assigned \n\n${detail}\n\n *Date* :${cdate}\n *Location* : ${location}\n\n, Login to portal https://training.masclass.in/test, and update training related detail.`;



        return axios.get(url, {params: queryParams })

        .then((response) => {

            const logContent = JSON.stringify({message: queryParams.message, response: response.data[0]});

            connection.query(`INSERT INTO requests (type, ref, receiver, content, created_by) VALUES ('Train-Stf', ?, ?, ?, ?)`, [tid, id, logContent, uid]);

            // console.log(`Message sent to ${queryParams.number}:`, response.data);

        })

        .catch((error) => {

            const logContent = JSON.stringify({message: queryParams.message, error: error.message, stack: error.stack});

            connection.query(`INSERT INTO requests (type, ref, receiver, content, created_by) VALUES ('Train-Stf', ?, ?, ?, ?)`, [tid, id, logContent, uid]);

            console.error(`Error sending message to ${queryParams.number}`);//, error.message);

        });

    });

}

function sendObsInv(params) {   

    const {id, tid, uid } = params;

    const query = `SELECT id, name, mobile, (SELECT concat('*Training : ',type, ', ',name, '* \n*Dated :',DATE_FORMAT(t_start,'%d-%b-%Y'),'*') FROM trainings WHERE id = ${tid}) tdetail FROM members WHERE id = ${id}`;



    connection.query(query, (error, results) => {

        queryParams.number = '91' + results[0].mobile;

        queryParams.message = `Dear *${results[0].name}*, \n\nTNGMS invited you as training observer \n\n${results[0].tdetail} \n\nYou can share you training feedback to us on this link https://mem.masclass.in/${encrypt(results[0].id.toString().padStart(4, '0') + '10006')} \n\nThank You...`;



        return axios.get(url, { params: queryParams })

        .then((response) => {

            const logContent = JSON.stringify({message: queryParams.message, response: response.data[0]});

            connection.query(`INSERT INTO requests (type, ref, receiver, content, created_by) VALUES ('Train-Obs', ?, ?, ?, ?)`, [tid, id, logContent, uid]);

            // console.log(`Message sent to ${queryParams.number}:`, response.data);

        })

        .catch((error) => {

            const logContent = JSON.stringify({message: queryParams.message, error: error.message, stack: error.stack});

            connection.query(`INSERT INTO requests (type, ref, receiver, content, created_by) VALUES ('Train-Obs', ?, ?, ?, ?)`, [tid, id, logContent, uid]);

            console.error(`Error sending message to ${queryParams.number}:`, error.message);

        });

    });

}



function chkMsg(params) {     

    const { ids, tid, tname, typ, detail, cdate, location, uid} = params;

    MqueryParams.msg = `Greetings from Tamil Nadu Model Schools.



You are invited to attend the  Academic Training Certificate Test Purpose scheduled on Thu, 27th Mar 2025  at  Thu, 27th Mar 2025 . Please find the training details below:



Training Location: https://maps.app.goo.gl/8Fuzy8h6



Registration Link: https://mem.masclass.in//bbbhdbcce



We look forward to your participation.



Warm regards,

Tamil Nadu Model Schools Training Team`;

    // MqueryParams.msg = `Greetings from Tamil Nadu Model Schools.\n\nYou are invited to attend the Academic Training Certificate Test Purpose scheduled on Thu, 27th Mar to Thu, 27th Mar at state. Please find the training details below:\n\nTraining Location: https://maps.app.goo.gl/8Fuzy8h6itkMnX26A/\n\nRegistration Link: https://mem.masclass.in/bbbhdbcce/\n\nWe look forward to your participation.\n\nWarm regards,\nTamil Nadu Model Schools Training Team`;

    // MqueryParams.msg= `Dear RCs/HMs/ASAs,\n\nWe would like to inform you that the question paper has been successfully uploaded to the QB portal. Kindly review the portal at your earliest convenience. Your timely action will greatly assist in facilitating the smooth printing process of the question paper.\n\nThank you for your attention.\n\nBest regards,\nTN Model Schools`;



    return axios.get(Murl, { params: MqueryParams })

    .then((response) => {

        console.log(`Message sent to :`, response);

    })

    .catch((error) => {

        console.error(`Error sending message to :`, error.message);                

    });

}

function sendTrainermsgSingle(params) {
    const { id, tid, tname, typ, detail, cdate, location, uid } = params;

    // Fetch details for the specific trainer
    const query = `SELECT id, mobile, name FROM users WHERE id = ?`;

    connection.query(query, [id], (error, results) => {
        if (error || !results.length) {
            console.error(`Error: Trainer with ID ${id} not found or query failed.`);
            return;
        }

        const trainer = results[0];
        const formattedNumber = '91' + trainer.mobile;
        
        // Generate the unique registration link
        const encryptedLink = encrypt(id.toString().padStart(4, '0') + 'a' + tid.toString().padStart(4, '0'));
        const link = `https://mem.masclass.in/${encryptedLink}`;

        // Construct Message
        const message = `*${typ} - ${tname}* new training assigned \n\n${detail}\n\n *Date* : ${cdate}\n *Location* : ${location}\n\n Please, confirm your participation by registering here: ${link}`;

        // Prepare Axios Request
        axios.get(url, { 
            params: { 
                ...queryParams, // Includes your API keys/token
                number: formattedNumber, 
                message: message 
            } 
        })
        .then((response) => {
            const logContent = JSON.stringify({ message: message, response: response.data });
            connection.query(
                `INSERT INTO requests (type, ref, receiver, content, created_by) VALUES ('Train-Stf', ?, ?, ?, ?)`, 
                [tid, id, logContent, uid]
            );
            console.log(`Message successfully sent to Trainer: ${trainer.name}`);
        })
        .catch((err) => {
            const logContent = JSON.stringify({ message: message, error: err.message });
            connection.query(
                `INSERT INTO requests (type, ref, receiver, content, created_by) VALUES ('Train-Stf', ?, ?, ?, ?)`, 
                [tid, id, logContent, uid]
            );
            console.error(`Failed to send message to ${formattedNumber}: ${err.message}`);
        });
    });
}


module.exports = {sendWHBatch, sendBatchTraining, sendTrainermsg, sendObsInv, sendMemMsg, chkMsg, sendTrainermsgSingle, sendTrainingTadaMsg};

