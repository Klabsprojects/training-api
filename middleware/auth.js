const jwt = require('jsonwebtoken');
const connection = require('../db');
const JWT_SECRET = 'klabs_traapi_secret_key';

const authenticateUser = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'Access Denied' });

    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
        const userId = decoded.id;

        // Check last activity in DB
        connection.query('SELECT last_activity FROM user_sessions WHERE user_id = ?', [userId], (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length === 0) return res.status(401).json({ error: 'Session expired, please login again' });

            const lastActivity = new Date(results[0].last_activity);
            const now = new Date();
            const timeDiff = (now - lastActivity) / 1000; // Time in seconds

            if (timeDiff > 1800) { // 30 minutes
                return res.status(401).json({ error: 'Session expired, please login again' });
            }

            // Extend session by updating last_activity timestamp
            connection.query('UPDATE user_sessions SET last_activity = NOW() WHERE user_id = ?', [userId], (updateErr) => {
                if (updateErr) return res.status(500).json({ error: updateErr.message });

                req.user = decoded;
                return next();  // ✅ Ensure next() is called after DB update
            });
        });

    } catch (err) {
        return res.status(401).json({ error: 'Invalid Token' });
    }
};

module.exports = { authenticateUser }; // ✅ Correct export
