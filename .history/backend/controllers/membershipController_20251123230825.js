import sql from "mssql";
// Import the global database pool exported from server.js
import { dbPool } from "../server.js"; 

/**
 * Endpoint 1: GET /api/membership/count
 * Fetches the total count of approved residents.
 */
export const getMembershipCount = async (req, res) => {
    try {
        const result = await dbPool.request().query(
            // We count distinct National IDs of residents whose requests are approved.
            `SELECT COUNT(DISTINCT NationalID) AS count FROM [MembershipRequests] 
             WHERE [Status] = 'Approved' AND [RoleName] = 'Resident'`
        );
        
        // Return the count
        res.json({ count: result.recordset[0].count });
    } catch (err) {
        console.error('Error fetching membership count:', err);
        res.status(500).json({ message: 'Internal Server Error: Could not fetch membership count.' });
    }
};

/**
 * Endpoint 2: GET /api/membership/courts
 * Fetches the list of unique court names for the dropdown.
 */
export const getCourtList = async (req, res) => {
    try {
        // Fetch unique court names from the table
        const result = await dbPool.request().query(
            `SELECT DISTINCT CourtName 
             FROM [MembershipRequests] 
             WHERE CourtName IS NOT NULL AND CourtName <> '' 
             ORDER BY CourtName`
        );
        
        // Return the list of courts
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching courts:', err);
        res.status(500).json({ message: 'Internal Server Error: Could not load court list.' });
    }
};

/**
 * Endpoint 3: POST /api/membership/request
 * Submits a new membership request.
 */
export const submitMembershipRequest = async (req, res) => {
    const { 
        ResidentName, NationalID, PhoneNumber, Email, 
        HouseNumber, CourtName, RoleName, Action 
    } = req.body;

    // Server-side validation
    if (!ResidentName || !NationalID || !Email || !CourtName || !RoleName) {
        return res.status(400).json({ message: 'Missing required fields: Name, ID, Email, Court, and Role are mandatory.' });
    }

    try {
        const request = dbPool.request();
        
        // --- Input Parameters (Crucial for SQL Injection Prevention) ---
        // Use appropriate SQL types based on your database schema
        request.input('ResidentName', sql.NVarChar(100), ResidentName);
        request.input('NationalID', sql.VarChar(8), NationalID);
        request.input('PhoneNumber', sql.VarChar(20), PhoneNumber);
        request.input('Email', sql.NVarChar(100), Email);
        request.input('HouseNumber', sql.VarChar(50), HouseNumber);
        request.input('CourtName', sql.VarChar(100), CourtName);
        request.input('RoleName', sql.VarChar(50), RoleName);
        request.input('Action', sql.NVarChar(sql.MAX), Action || ''); 
        
        const insertQuery = `
            INSERT INTO [MembershipRequests] 
            (ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Action, Status, RequestedAt)
            VALUES 
            (@ResidentName, @NationalID, @PhoneNumber, @Email, @HouseNumber, @CourtName, @RoleName, @Action, 'Pending', GETDATE());
        `;

        await request.query(insertQuery);
        
        // Successful submission
        res.status(201).json({ message: 'Membership request submitted successfully. Awaiting approval.' });

    } catch (err) {
        console.error('Error inserting membership request:', err);
        
        // Check for specific unique constraint error (e.g., if NationalID is a unique key)
        if (err.number === 2627) { 
             return res.status(409).json({ message: 'A membership request with this National ID already exists.' });
        }

        res.status(500).json({ message: 'An unexpected internal server error occurred.' });
    }
};