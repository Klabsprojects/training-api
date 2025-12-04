// QGen/test.js

const pool = require('./db');

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error getting MySQL connection:', err);
    return;
  }

  console.log('Connected to MySQL!');

  // Perform additional database operations here

  // Release the connection back to the pool when done
  connection.release();
});
