
const connection = require('../db');

  exports.list = (req, res) => {
    const user = req.user;
    connection.query("SELECT id, quest, qtype, options FROM quests WHERE status = 'Active'", (err, results) => {
      if (err) 
          res.status(500).json({ error: err.message });
      else {
          if (results.length === 0) 
              res.status(404).json({error: true, message: 'Question  Not Available' });
          else {
                  res.json({error: false, message: 'Question List', data:results, user});
            }
        }
      });
  };

  exports.create = async (req, res) => {
    let data = req.body;
    const user = req.user;
    data.created_by = user.id;
    if (data.options && Array.isArray(data.options) && data.options.length > 0) 
      data.options = JSON.stringify(data.options); 
    else 
      data.options = null; 
    
    connection.query('INSERT INTO quests SET ?', data, (err, results) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({error: false, message: 'Question Created Successfully', data:results, user});
      }
    });
  };

  exports.getById = (req, res) => {
    const id = req.params.id;
    const user = req.user;
    connection.query('SELECT * FROM quests WHERE id = ?', [id], (err, results) => {
      if (err) 
        res.status(500).json({ error: err.message });
      else {
        if (results.length === 0) 
          res.status(404).json({error: true, message: 'Data not found for the given ID' });
        else 
          res.json({ error: false, message: 'Question Detail', data: results[0], user});
      }
    });
  };

  exports.update = (req, res) => {  
      const id = req.params.id;
      const data = req.body;
      const user = req.user;
      // if (data.options && Array.isArray(data.options) && data.options.length > 0) 
      data.options = JSON.stringify(data.options); 
      connection.query('UPDATE quests SET ? WHERE id = ?', [data, id], (err) => {
        if (err) 
          res.status(500).json({ error: err.message });
        else 
            res.json({error: false, message: 'Question Updated', user});
      });
  };

  exports.selected = (req, res) => {
    const q_ids = req.query.ids;
    const user = req.user;
    const qIdsArray = Array.isArray(q_ids) ? q_ids : q_ids.split(',');

    const query = "SELECT id, quest, qtype, options FROM quests WHERE id IN (?);";

    connection.query(query, [qIdsArray], (err, results) => {
      if (err) return res.status(500).json({ error: err.message });     

      if (results.length === 0) return res.status(404).json({ error: true, message: 'Questions not found for the given IDs' });      

      res.json({ error: false, message: 'Selected Questions', data: results, user});
    });
  }

  exports.downloaded = (req, res) => {
    const id = req.params.id;
    const user = req.user;
    const currentDate = new Date().toISOString();
    const userDetails = { user: user.id, timestamp: currentDate };
    connection.query('UPDATE quest_papers SET used = used + 1, used_log = JSON_ARRAY_APPEND(used_log, "$", ?) WHERE id = ?', [JSON.stringify(userDetails), id], (err) => {
      if (err) 
        res.status(500).json({ error: err.message });
      else 
        res.json({error: false, message: 'Download detail Updated', user});
    });
  };
