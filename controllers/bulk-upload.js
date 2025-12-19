// server.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
//const bcrypt = require('bcrypt');
const xlsx = require('xlsx'); //

const pool = require('../db'); // Your MySQL connection pool
const router = express.Router();
// --- Configuration ---
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const CREATED_BY_USER_ID = 1; // Mandatory field for your schema

// Ensure the uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

// 1. Multer Setup for File Handling
// We save the file temporarily to disk before processing
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Use a unique filename
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.csv', '.xlsx'];
        const fileExtension = path.extname(file.originalname).toLowerCase();

        if (allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            // Updated error message to include Excel
            cb(new Error("Invalid file format. Please upload .csv or .xlsx files."), false); 
        }
    }
}).single('user_file');

// --- Utility Function for Password Hashing ---
const hashPassword = (password) => {
    // Generate a salt and hash the password synchronously for simplicity, or use async for production
    const saltRounds = 10;
    return password;
    //return bcrypt.hashSync(password, saltRounds);
};

// 2. The API Endpoint
router.post('/user-bulk-upload', (req, res) => {
    // Wrap the entire process in the Multer upload middleware
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(500).json({ message: "Multer error during file upload", error: err.message });
        } else if (err) {
            return res.status(400).json({ message: err.message });
        }

        if (!req.file) {
            // Note: Updated message to reflect support for Excel too
            return res.status(400).json({ message: "No file provided. Please upload a CSV or XLSX file." }); 
        }

        const filePath = req.file.path;
        // Extract the file extension
        const fileExtension = path.extname(req.file.originalname).toLowerCase(); 
        
        let usersToInsert = [];
        let totalRows = 0;
        let successfulInserts = 0;
        let failedUsernames = [];

        try {
            // 3. Read and Parse the file based on its extension
            if (fileExtension === '.csv') {
                
                // --- CSV STREAM PROCESSING (Existing Logic) ---
                await new Promise((resolve, reject) => {
                    fs.createReadStream(filePath)
                        .pipe(csv()) 
                        .on('data', (row) => {
                            totalRows++;
                            
                            // **Data Validation and Transformation**
                            if (!row.username || !row.password) {
                                console.warn(`Skipping row ${totalRows}: Missing username or password.`);
                                return; 
                            }
                            
                            const hashedPassword = hashPassword(String(row.password));
                            
                            // Map columns to your table schema (13 fields)
                            const userRecord = [
                                String(row.name || ''),
                                String(row.username),
                                hashedPassword, // The 'pass' column
                                String(row.mobile || ''),
                                String(row.email || ''),
                                String(row.role || 'User'),
                                String(row.resp || ''),
                                String(row.auth || ''),
                                String(row.notes || ''),
                                String(row.profile_file || ''),
                                String(row.others || ''),
                                'Active',
                                CREATED_BY_USER_ID,
                            ];
                            usersToInsert.push(userRecord);
                        })
                        .on('end', () => {
                            console.log(`CSV file successfully processed. Found ${usersToInsert.length} users to insert.`);
                            resolve();
                        })
                        .on('error', (e) => {
                            reject(new Error(`Error processing CSV file: ${e.message}`));
                        });
                });

            } else if (fileExtension === '.xlsx') {
                
                // --- XLSX PROCESSING (NEW LOGIC) ---
                const workbook = xlsx.readFile(filePath);
                // Assuming the data is in the first sheet
                const sheetName = workbook.SheetNames[0]; 
                const worksheet = workbook.Sheets[sheetName];
                
                // Convert sheet data to an array of JSON objects, using first row as headers
                const jsonRows = xlsx.utils.sheet_to_json(worksheet);

                for (const rowObj of jsonRows) {
                    totalRows++;
                    
                    // Normalize keys to lowercase and trim spaces for consistent access
                    const processedRow = Object.keys(rowObj).reduce((acc, key) => {
                        acc[String(key).toLowerCase().trim()] = rowObj[key];
                        return acc;
                    }, {});

                    // **Data Validation and Transformation**
                    // Use the lowercased, trimmed keys
                    if (!processedRow.username || !processedRow.password) {
                        console.warn(`Skipping row ${totalRows}: Missing username or password in Excel.`);
                        continue;
                    }
                    
                    const hashedPassword = hashPassword(String(processedRow.password));
                    
                    // Map columns to your table schema (13 fields)
                    const userRecord = [
                        String(processedRow.name || ''),
                        String(processedRow.username),
                        hashedPassword, // The 'pass' column
                        String(processedRow.mobile || ''),
                        String(processedRow.email || ''),
                        String(processedRow.role || 'User'),
                        String(processedRow.resp || ''),
                        String(processedRow.auth || ''),
                        String(processedRow.notes || ''),
                        String(processedRow.profile_file || ''),
                        String(processedRow.others || ''),
                        'Active',
                        CREATED_BY_USER_ID,
                    ];
                    usersToInsert.push(userRecord);
                }
                console.log(`Excel file successfully processed. Found ${usersToInsert.length} users to insert.`);

            } else {
                 // Should be unreachable due to Multer, but good practice
                 throw new Error(`Unsupported file type: ${fileExtension}`);
            }

            if (usersToInsert.length === 0) {
                return res.status(400).json({ message: "No valid users found in the file." });
            }

            // 4. Bulk Insert (existing logic remains)
            // Using a loop to handle UNIQUE constraint errors gracefully
            for (const user of usersToInsert) {
                try {
                    const insertQuery = `
                        INSERT INTO users (
                            name, username, pass, mobile, email, role, resp, auth, notes, profile_file, others, status, created_by
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    const result = await executePromised(insertQuery, user);
                    
                    // --- DEBUG LOG ---
                    console.log(`DEBUG SUCCESS: User ${user[1]} executed. Result:`, result);
                    
                    if (result.affectedRows > 0) {
                        successfulInserts++;
                    }
                } catch (dbError) {
                    // Check for MySQL error code 1062 (Duplicate entry for unique key, which is 'username')
                    if (dbError.code === 'ER_DUP_ENTRY') {
                        // The username is at index 1 in the 'user' array
                        failedUsernames.push(user[1]); 
                    } else {
                        console.error(`Unknown DB error for user ${user[1]}:`, dbError.message);
                        failedUsernames.push(user[1]);
                    }
                }
            }


            // 5. Final Response (existing logic remains)
            res.status(200).json({
                message: "Bulk upload process completed",
                total_rows_in_file: totalRows,
                successfully_inserted: successfulInserts,
                failed_to_insert_count: failedUsernames.length,
                failed_usernames: failedUsernames,
                note: "Failed insertions are due to missing data or duplicate usernames."
            });

        } catch (e) {
            console.error(e);
            res.status(500).json({ message: e.message || "An internal error occurred." });
        } finally {
            // 6. Cleanup: Delete the temporary file
            fs.unlink(filePath, (err) => {
                if (err) console.error("Failed to delete temp file:", err);
            });
        }
    });
});

// --- Manual Promise Wrapper Function ---
// Use this function instead of await pool.execute()
const executePromised = (sql, values) => {
    return new Promise((resolve, reject) => {
        // NOTE: We assume 'pool' exists in this scope and has a .execute() method
        pool.execute(sql, values, (err, results, fields) => {
            if (err) {
                // If the DB threw an error (like ER_DUP_ENTRY)
                return reject(err);
            }
            // Resolve the promise with the results object, which contains affectedRows
            resolve(results); 
        });
    });
};
module.exports = router;