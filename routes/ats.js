// routes/ats.js (matches your working quests.js style)
const express = require("express");
const router = express.Router();
const connection = require("../db"); // Your existing pool

// 1. ADD (all fields optional)
router.post("/add", (req, res) => {
    const user = req.user;
    let data = req.body;
    
    const query = `INSERT INTO ats 
                   (sl_no, Type, District, udise_code, School_Name, ATS_Name, 
                    Contact_Number, is_active, designation) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    connection.query(query, [
        data.sl_no, data.Type, data.District, data.udise_code, 
        data.School_Name, data.ATS_Name, data.Contact_Number, 
        data.is_active || 1, data.designation
    ], (err, results) => {
        if (err) {
            return res.status(500).json({ error: true, message: err.message });
        }
        res.status(201).json({ 
            error: false, 
            message: 'Record added successfully', 
            id: results.insertId,
            user 
        });
    });
});

// 2. UPDATE (all fields optional)
router.put("/update/:id", (req, res) => {
    const id = req.params.id;
    const user = req.user;
    const data = req.body;
    
    // Build dynamic update query
    let updates = [];
    let params = [];
    
    if (data.sl_no !== undefined) { updates.push("sl_no = ?"); params.push(data.sl_no); }
    if (data.Type !== undefined) { updates.push("Type = ?"); params.push(data.Type); }
    if (data.District !== undefined) { updates.push("District = ?"); params.push(data.District); }
    if (data.udise_code !== undefined) { updates.push("udise_code = ?"); params.push(data.udise_code); }
    if (data.School_Name !== undefined) { updates.push("School_Name = ?"); params.push(data.School_Name); }
    if (data.ATS_Name !== undefined) { updates.push("ATS_Name = ?"); params.push(data.ATS_Name); }
    if (data.Contact_Number !== undefined) { updates.push("Contact_Number = ?"); params.push(data.Contact_Number); }
    if (data.is_active !== undefined) { updates.push("is_active = ?"); params.push(data.is_active); }
    if (data.designation !== undefined) { updates.push("designation = ?"); params.push(data.designation); }
    
    params.push(id);
    
    const query = `UPDATE ats SET ${updates.join(", ")} WHERE id = ?`;
    
    connection.query(query, params, (err) => {
        if (err) {
            return res.status(500).json({ error: true, message: err.message });
        }
        res.json({ error: false, message: 'Record updated', id: parseInt(id), user });
    });
});

// 3. SOFT DELETE (is_active = 0)
router.delete("/delete/:id", (req, res) => {
    const id = req.params.id;
    const user = req.user;
    
    connection.query("UPDATE ats SET is_active = 0 WHERE id = ?", [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: true, message: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ error: true, message: 'Record not found' });
        }
        res.json({ error: false, message: 'Record soft deleted', id: parseInt(id), user });
    });
});

// 4. GET all records
router.get("/get_all", (req, res) => {
    const user = req.user;
    connection.query(
        `SELECT id, sl_no, Type, District, udise_code, School_Name, 
                ATS_Name, Contact_Number, is_active, designation
         FROM ats ORDER BY id ASC, District`,
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: true, message: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: true, message: 'No records found' });
            }
            res.json({ error: false, message: 'All records', data: results, user });
        }
    );
});

// 5. GET active records only
router.get("/get_active", (req, res) => {
    const user = req.user;
    connection.query(
        `SELECT id, sl_no, Type, District, udise_code, School_Name, 
                ATS_Name, Contact_Number, is_active, designation
         FROM ats WHERE is_active = 1 ORDER BY id ASC, District`,
        (err, results) => {
            if (err) {
                return res.status(500).json({ error: true, message: err.message });
            }
            if (results.length === 0) {
                return res.status(404).json({ error: true, message: 'No active records' });
            }
            res.json({ error: false, message: 'Active records', data: results, user });
        }
    );
});

module.exports = router;
