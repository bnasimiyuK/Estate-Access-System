// Example: controllers/logsController.js

// Assume this imports your MSSQL connection and query helper function
const db = require('../db'); 

// The specific SQL query required by the frontend data structure
const GET_OVERRIDE_LOGS_QUERY = `
    SELECT TOP (1000) 
        [id], 
        [gateId], 
        [action], 
        [reason], 
        [userId], 
        [createdAt] 
    FROM 
        [EstateAccessManagementSystem].[dbo].[gate_overrides]
`;

/**
 * Controller function to fetch the top 1000 gate override logs.
 * This endpoint is protected and requires Admin (Level 1) privileges.
 */
exports.getGateOverrideLogs = async (req, res) => {
    try {
        // Execute the SQL query. 'db.query' is assumed to be a wrapper 
        // that handles the connection pool and returns the MSSQL recordset.
        const result = await db.query(GET_OVERRIDE_LOGS_QUERY);
        
        // Return the data as a clean JSON array of objects (the recordset)
        return res.status(200).json(result.recordset); 

    } catch (error) {
        console.error('Database error fetching gate override logs:', error.message);
        // Respond with a 500 status on any server or database failure
        return res.status(500).json({ 
            message: 'Failed to retrieve gate override logs from database.',
            error: error.message
        });
    }
};