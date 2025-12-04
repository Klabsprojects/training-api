require('dotenv').config();

const mysql = require('mysql2');
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || '';
const DB_PASS = process.env.DB_PASS || '';
const DB_NAME = process.env.DB_NAME || '';

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,//'adm_usr',
  password: DB_PASS,//'123456',
  database: DB_NAME,//'qgen_db',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
});

const getQuestionAndChoices = async (q_id) => {
  const queryText = `
    SELECT question_text
    FROM questions
    WHERE q_id = ?;

    SELECT choice_text, choice_correct_yn
    FROM choices
    WHERE q_id = ?;
  `;

  try {
    // Execute the query using the existing query function
    const result = await query(queryText, [q_id, q_id]);

    // Process the result and return the formatted data
    const formattedResult = {
      question: result[0][0].question_text,
      choices: result[1],
    };

    return formattedResult;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Export the pool for shared use across the application
module.exports = pool;
