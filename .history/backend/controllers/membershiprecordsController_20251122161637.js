import sql from "mssql";
// Import the global connection pool from server.js
import { dbPool } from "../server.js"; 


// ====================================================
// GET ALL MEMBERSHIP RECORDS (GET /api/membershiprecords/all)
// ====================================================
export const getAllMembershipRecords = async (req, res) => {
    try {
        const pool = await dbPool; 
        const result = await pool.request().query(`
            SELECT * FROM MembershipRequests ORDER BY RequestedAt DESC;
        `);

        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("❌ Failed to fetch all membership requests:", err.message);
        res.status(500).json({ success: false, message: "Server error while fetching all records." });
    }
};


// ====================================================
// GET PENDING REQUESTS (GET /api/membershiprecords/requests/pending)
// ====================================================
export const getPendingRequests = async (req, res) => {
    try {
        const pool = await dbPool; 
        const result = await pool.request().query(`
            SELECT * FROM MembershipRequests WHERE Status = 'Pending' ORDER BY RequestedAt ASC;
        `);

        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("❌ Failed to fetch pending requests:", err.message);
        res.status(500).json({ success: false, message: "Server error while fetching pending requests." });
    }
};

// ====================================================
// GET APPROVED RESIDENTS (GET /api/membershiprecords/residents/approved)
// Queries the MembershipRecords table
// ====================================================
export const getApprovedResidents = async (req, res) => {
    try {
        const pool = await dbPool; 
        const result = await pool.request().query(`
            SELECT ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName FROM MembershipRecords ORDER BY RegistrationDate DESC;
        `);

        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("❌ Failed to fetch approved residents:", err.message);
        res.status(500).json({ success: false, message: "Server error while fetching approved residents." });
    }
};


// ====================================================
// APPROVE MEMBERSHIP RECORD (PUT /api/membershiprecords/approve/:RequestID)
// 💡 Uses a SQL TRANSACTION for atomicity (Update Request + Insert Record)
// ====================================================
export const approveMembershipRecord = async (req, res) => {
    const RequestID = req.params.id; // Renamed from RequestID to id in the route
    const { adminAction } = req.body;
    const pool = await dbPool;
    const transaction = pool.transaction(); 

    try {
        await transaction.begin();

        // 1. SELECT the request data (must be 'Pending')
        const requestDataResult = await transaction.request()
            .input("RequestID", sql.Int, RequestID)
            .query(`
                SELECT ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Action, RequestedAt 
                FROM MembershipRequests 
                WHERE RequestID = @RequestID AND Status = 'Pending';
            `);
        
        const residentData = requestDataResult.recordset[0];

        if (!residentData) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: "Pending Request ID not found or already processed." });
        }

        // 2. INSERT the data into the official MembershipRecords table
        await transaction.request()
            .input('RequestID', sql.Int, RequestID)
            .input('ResidentName', sql.NVarChar(100), residentData.ResidentName)
            .input('NationalID', sql.NVarChar(50), residentData.NationalID)
            .input('PhoneNumber', sql.NVarChar(50), residentData.PhoneNumber)
            .input('Email', sql.NVarChar(100), residentData.Email)
            .input('HouseNumber', sql.NVarChar(50), residentData.HouseNumber)
            .input('CourtName', sql.NVarChar(50), residentData.CourtName)
            .input('RoleName', sql.NVarChar(50), residentData.RoleName)
            .input('Action', sql.NVarChar(100), adminAction || 'Approved by Admin')
            .input('RequestedAt', sql.DateTime, residentData.RequestedAt) 
            .query(`
                INSERT INTO MembershipRecords 
                (RequestID, ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Status, RegistrationDate, Action)
                VALUES 
                (@RequestID, @ResidentName, @NationalID, @PhoneNumber, @Email, @HouseNumber, @CourtName, @RoleName, 'Approved', GETDATE(), @Action);
            `);

        // 3. UPDATE the MembershipRequests status to 'Approved'
        await transaction.request()
            .input("RequestID", sql.Int, RequestID)
            .query(`
                UPDATE MembershipRequests SET Status = 'Approved', ApprovedAt = GETDATE(), Action = @Action WHERE RequestID = @RequestID;
            `);

        // 4. Commit the transaction
        await transaction.commit();
        res.status(200).json({ success: true, message: "Membership approved and record created." });

    } catch (err) {
        await transaction.rollback();
        console.error("❌ Approval transaction failed:", err.message);
        res.status(500).json({ success: false, message: "Approval failed due to a server or database error.", details: err.message });
    }
};

// ====================================================
// REJECT MEMBERSHIP RECORD (PUT /api/membershiprecords/reject/:RequestID)
// ====================================================
export const rejectMembershipRecord = async (req, res) => {
    const RequestID = req.params.id; 
    const { adminAction } = req.body;
    
    try {
        const pool = await dbPool;
        
        // 1. UPDATE the MembershipRequests status to 'Rejected'
        const result = await pool.request()
            .input("RequestID", sql.Int, RequestID)
            .input("Action", sql.NVarChar(100), adminAction || 'Rejected by Admin')
            .query(`
                UPDATE MembershipRequests SET Status = 'Rejected', Action = @Action, ApprovedAt = NULL WHERE RequestID = @RequestID AND Status = 'Pending';
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, message: "Pending Request ID not found or already processed." });
        }

        res.status(200).json({ success: true, message: "Membership request rejected." });

    } catch (err) {
        console.error("❌ Rejection failed:", err.message);
        res.status(500).json({ success: false, message: "Rejection failed due to a server or database error.", details: err.message });
    }
};

// Placeholder for delete/sync routes (You can implement these later)
export const deleteMembershipRecord = async (req, res) => {
    res.status(501).json({ success: false, message: "Delete functionality not yet implemented." });
}

export const syncMembershipRecords = async (req, res) => {
    res.status(501).json({ success: false, message: "Sync functionality not yet implemented." });
}