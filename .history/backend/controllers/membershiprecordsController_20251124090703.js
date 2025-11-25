// controllers/membershipController.js

// Assuming you use the 'mssql' library for SQL Server connection
const sql = require('mssql'); 
// Replace with your actual database configuration file
const dbConfig = require('../config/dbConfig'); 

// Utility to wrap async functions and handle errors automatically
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * @desc Get resident membership records (top 1000)
 * @route GET /api/residents/records
 * @access Private
 */
exports.getResidentRecords = asyncHandler(async (req, res) => {
    // 🔑 Step 1: Permission Check
    // Customize this based on the roles defined in your JWT payload (req.user)
    if (req.user.role !== 'Admin' && req.user.role !== 'MembershipManager') {
        return res.status(403).json({ message: 'Access denied. Insufficient privileges.' });
    }

    // 🔑 Step 2: Define the SQL Query
    const sqlQuery = `
        SELECT TOP (1000) 
            [ResidentName], 
            [NationalID], 
            [PhoneNumber], 
            [Email], 
            [HouseNumber], 
            [CourtName], 
            [Status], 
            [RequestedAt], 
            [Action], 
            [RequestID], 
            [RoleName]
        FROM [EstateAccessManagementSystem].[dbo].[MembershipRecords_Backup]
        ORDER BY RequestedAt DESC; -- Optional: Order by most recent requests
    `;

    let pool;
    try {
        // 🔑 Step 3: Establish connection and execute query
        pool = await sql.connect(dbConfig);
        const result = await pool.request().query(sqlQuery);
        
        const records = result.recordset;

        // 🔑 Step 4: Send the data
        res.status(200).json(records);

    } catch (error) {
        console.error('Database query failed:', error);
        // Send a generic error message back to the client
        res.status(500).json({ 
            message: 'Failed to retrieve membership records due to a server error.'
        });
    } finally {
        // 🔑 Step 5: Close the connection (or release the pool)
        if (pool) {
            pool.close();
        }
    }
});