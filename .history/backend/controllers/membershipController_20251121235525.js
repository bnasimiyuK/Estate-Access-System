// controllers/membershipController.js

import sql from "mssql";
// 💡 IMPORTANT: Import the global connection pool from server.js
import { dbPool } from "../server.js"; 


// ====================================================
// SUBMIT MEMBERSHIP REQUEST (POST /api/membership)
// ====================================================
export const submitMembershipRequest = async (req, res) => {
    console.log("--- MEMBERSHIP PAYLOAD ---", req.body);
    const { ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Action } = req.body;

    // List of valid roles
    const validRoles = ["Resident", "Security", "Admin", "Visitor"];
    
    // 400 Bad Request if essential fields are missing
    if (!ResidentName || !NationalID || !PhoneNumber || !Email || !HouseNumber || !CourtName || !RoleName) {
        return res.status(400).json({ success: false, message: "All fields except Action are required." });
    }

    // Validate the role against the allowed list
    if (!validRoles.includes(RoleName)) {
        return res.status(400).json({ 
            success: false, 
            message: `Invalid role selected: ${RoleName}. Please select one of ${validRoles.join(', ')}.` 
        });
    }

    try {
        // 🛑 FIX 1: Use the global connection pool (dbPool) 🛑
        const pool = await dbPool; 

        const result = await pool.request()
            .input("ResidentName", sql.NVarChar(100), ResidentName)
            .input("NationalID", sql.NVarChar(50), NationalID)
            .input("PhoneNumber", sql.NVarChar(50), PhoneNumber)
            .input("Email", sql.NVarChar(100), Email)
            .input("HouseNumber", sql.NVarChar(50), HouseNumber)
            .input("CourtName", sql.NVarChar(50), CourtName)
            .input("RoleName", sql.NVarChar(50), RoleName)
            .input("Action", sql.NVarChar(100), Action || null) 
            .query(`
                INSERT INTO MembershipRequests
                (ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Action, Status, RequestedAt)
                OUTPUT INSERTED.RequestID -- Use OUTPUT to return the new ID
                VALUES
                (@ResidentName, @NationalID, @PhoneNumber, @Email, @HouseNumber, @CourtName, @RoleName, @Action, 'Pending', GETDATE());
            `);

        // Get the new RequestID for the frontend response
        const newRequestID = result.recordset[0].RequestID;

        res.status(201).json({ 
            success: true, 
            message: "Membership request submitted successfully.",
            requestID: newRequestID 
        });

    } catch (err) {
        console.error("❌ Membership request failed:", err.message);
        // Check for common DB errors (e.g., duplicate NationalID)
        if (err.number === 2627) {
             return res.status(409).json({ success: false, message: "A request with this National ID already exists." });
        }
        res.status(500).json({ 
            success: false, 
            message: "Server error or Database operation failed.", 
            details: err.message 
        });
    }
};

// ====================================================
// APPROVE MEMBERSHIP REQUEST (PUT /api/membership/approve/:RequestID)
// 🛑 FIX 2: Use a SQL TRANSACTION for atomicity (Update + Insert) 🛑
// ====================================================
export const approveMembershipRequest = async (req, res) => {
    const { RequestID } = req.params;
    const pool = await dbPool;
    const transaction = pool.transaction(); // Start transaction

    try {
        await transaction.begin();

        // 1. SELECT the request data (must be 'Pending')
        let requestDataResult = await transaction.request()
            .input("RequestID", sql.Int, RequestID)
            .query(`
                SELECT ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName 
                FROM MembershipRequests 
                WHERE RequestID = @RequestID AND Status = 'Pending';
            `);
        
        const residentData = requestDataResult.recordset[0];

        if (!residentData) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: "Pending Request ID not found or already processed." });
        }

        // 2. INSERT into the Residents table
        let insertResidentRequest = transaction.request();
        // Bind parameters from the fetched data
        insertResidentRequest.input('ResidentName', sql.NVarChar(100), residentData.ResidentName);
        insertResidentRequest.input('NationalID', sql.NVarChar(50), residentData.NationalID);
        insertResidentRequest.input('PhoneNumber', sql.NVarChar(50), residentData.PhoneNumber);
        insertResidentRequest.input('Email', sql.NVarChar(100), residentData.Email);
        insertResidentRequest.input('HouseNumber', sql.NVarChar(50), residentData.HouseNumber);
        insertResidentRequest.input('CourtName', sql.NVarChar(50), residentData.CourtName);
        insertResidentRequest.input('RoleName', sql.NVarChar(50), residentData.RoleName);
        
        await insertResidentRequest.query(`
            INSERT INTO Residents (ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Status, RegistrationDate)
            VALUES (@ResidentName, @NationalID, @PhoneNumber, @Email, @HouseNumber, @CourtName, @RoleName, 'Approved', GETDATE());
        `);

        // 3. UPDATE the MembershipRequest status to 'Approved'
        await transaction.request()
            .input("RequestID_Update", sql.Int, RequestID)
            .query("UPDATE MembershipRequests SET Status = 'Approved', ApprovalDate = GETDATE() WHERE RequestID = @RequestID_Update");

        // Success: Commit both changes
        await transaction.commit(); 
        res.json({ success: true, message: "Request approved and Resident created successfully." });

    } catch (err) {
        // Failure: Rollback both changes
        await transaction.rollback();
        console.error("❌ approveMembershipRequest Error:", err);
        // Check if the INSERT failed due to a constraint violation in the Residents table
        if (err.number === 2627) { 
            return res.status(409).json({ success: false, message: "The resident already exists in the approved list." });
        }
        res.status(500).json({ success: false, message: "Server error during approval process.", details: err.message });
    }
};

// ====================================================
// REJECT MEMBERSHIP REQUEST (PUT /api/membership/reject/:RequestID)
// ====================================================
export const rejectMembershipRequest = async (req, res) => {
    const { RequestID } = req.params;
    try {
        // 🛑 FIX 1: Use the global connection pool (dbPool) 🛑
        const pool = await dbPool; 
        const result = await pool.request()
            .input("RequestID", sql.Int, RequestID)
            .query("UPDATE MembershipRequests SET Status = 'Rejected', ApprovalDate = GETDATE() WHERE RequestID = @RequestID AND Status = 'Pending'");

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Pending Request ID not found or already processed." });
        }

        res.json({ success: true, message: "Request rejected successfully." });
    } catch (err) {
        console.error("❌ rejectMembershipRequest Error:", err);
        res.status(500).json({ success: false, message: "Server error", details: err.message });
    }
};

// ====================================================
// GET ALL MEMBERSHIP REQUESTS (GET /api/membership)
// ====================================================
export const getMembershipRequests = async (req, res) => {
    try {
        // 🛑 FIX 1: Use the global connection pool (dbPool) 🛑
        const pool = await dbPool;
        const result = await pool.request().query(`
            SELECT 
                RequestID, ResidentName, NationalID, PhoneNumber, Email, 
                HouseNumber, CourtName, RoleName, Status, RequestedAt
            FROM MembershipRequests 
            ORDER BY RequestedAt DESC
        `);

        res.json({ success: true, requests: result.recordset });
    } catch (err) {
        console.error("❌ getMembershipRequests Error:", err);
        res.status(500).json({ success: false, message: "Server error fetching requests", details: err.message });
    }
};

// ====================================================
// GET TOTAL MEMBERSHIP REQUEST COUNT (GET /api/membership/count - assuming you define this route)
// ====================================================
export const getMembershipCount = async (req, res) => {
    try {
        // 🛑 FIX 1: Use the global connection pool (dbPool) 🛑
        const pool = await dbPool;
        const result = await pool.request()
            .query(`SELECT COUNT(*) AS totalRequests FROM MembershipRequests`);

        const count = result.recordset[0]?.totalRequests || 0;
        res.status(200).json({ totalRequests: count });

    } catch (err) {
        console.error("❌ getMembershipCount Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch membership count", details: err.message });
    }
};