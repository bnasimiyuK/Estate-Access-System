// ==========================================
// controllers/membershipController.js
// Unified controller for Residents + Admins
// ==========================================

import sql from "mssql";
import dotenv from "dotenv";
dotenv.config();

// ==========================================
// Database Configuration
// ==========================================
const dbConfig = {
    user: process.env.DB_USER || "Beverly",
    password: process.env.DB_PASS || "Bev@1234567",
    server: process.env.DB_SERVER || "localhost",
    database: process.env.DB_NAME || "EstateAccessManagementSystem",
    options: { encrypt: true, trustServerCertificate: true },
};

// ====================================================
// RESIDENT: Submit membership request
// ====================================================
export const submitMembershipRequest = async (req, res) => {
    const {
        ResidentName,
        NationalID,
        PhoneNumber,
        Email,
        HouseNumber,
        CourtName,
        RoleName,
    } = req.body;

    try {
        if (!ResidentName || !NationalID || !PhoneNumber || !Email || !HouseNumber || !CourtName || !RoleName) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const pool = await sql.connect(dbConfig);

        // Calculate next RequestID
        const maxRequestResult = await pool.request().query("SELECT ISNULL(MAX(RequestID), 0) AS maxID FROM MembershipRequests");
        const nextRequestID = maxRequestResult.recordset[0].maxID + 1;

        // Insert new membership request
        await pool.request()
            .input("RequestID", sql.Int, nextRequestID)
            .input("ResidentName", sql.NVarChar(100), ResidentName)
            .input("NationalID", sql.NVarChar(50), NationalID)
            .input("PhoneNumber", sql.NVarChar(50), PhoneNumber)
            .input("Email", sql.NVarChar(100), Email)
            .input("HouseNumber", sql.NVarChar(50), HouseNumber)
            .input("CourtName", sql.NVarChar(50), CourtName)
            .input("RoleName", sql.NVarChar(50), RoleName)
            .input("Status", sql.NVarChar(50), "Pending")
            .input("RequestedAt", sql.DateTime, new Date())
            .query(`
                INSERT INTO MembershipRequests
                (RequestID, ResidentName, NationalID, PhoneNumber, Email, 
                 HouseNumber, CourtName, RoleName, Status, RequestedAt)
                VALUES 
                (@RequestID, @ResidentName, @NationalID, @PhoneNumber, @Email, 
                 @HouseNumber, @CourtName, @RoleName, @Status, @RequestedAt)
            `);

        return res.status(200).json({ success: true, message: "Membership request submitted successfully. Awaiting approval." });
    } catch (err) {
        console.error("❌ submitMembershipRequest Error:", err);
        return res.status(500).json({ success: false, message: "Server error during submission", error: err.message });
    }
};

// ====================================================
// ADMIN: Get all membership requests
// ====================================================
export const getAllMembershipRequests = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query("SELECT TOP (1000) * FROM MembershipRequests ORDER BY RequestedAt DESC");
        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("❌ getAllMembershipRequests Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ====================================================
// ADMIN: Approve membership request
// ====================================================
export const approveMembershipRequest = async (req, res) => {
    const { RequestID } = req.params;
    try {
        const pool = await sql.connect(dbConfig);

        // Get request details
        const requestResult = await pool.request()
            .input("RequestID", sql.Int, RequestID)
            .query("SELECT * FROM MembershipRequests WHERE RequestID = @RequestID");

        if (requestResult.recordset.length === 0) return res.status(404).json({ success: false, message: "Request not found" });

        const r = requestResult.recordset[0];

        // Calculate next RecordID
        const maxRecordResult = await pool.request().query("SELECT ISNULL(MAX(RecordID), 0) AS maxID FROM MembershipRecords");
        const nextRecordID = maxRecordResult.recordset[0].maxID + 1;

        // Update request status to Approved
        await pool.request()
            .input("RequestID", sql.Int, RequestID)
            .query("UPDATE MembershipRequests SET Status = 'Approved' WHERE RequestID = @RequestID");

        // Move approved request to MembershipRecords
        await pool.request()
            .input("RecordID", sql.Int, nextRecordID)
            .input("RequestID", sql.Int, RequestID)
            .input("ResidentName", sql.NVarChar(100), r.ResidentName)
            .input("NationalID", sql.NVarChar(50), r.NationalID)
            .input("PhoneNumber", sql.NVarChar(50), r.PhoneNumber)
            .input("Email", sql.NVarChar(100), r.Email)
            .input("HouseNumber", sql.NVarChar(50), r.HouseNumber)
            .input("CourtName", sql.NVarChar(50), r.CourtName)
            .input("RoleName", sql.NVarChar(50), r.RoleName)
            .input("Status", sql.NVarChar(50), "Approved")
            .input("RequestedAt", sql.DateTime, r.RequestedAt)
            .input("Action", sql.NVarChar(50), r.Action)
            .query(`
                INSERT INTO MembershipRecords
                (RecordID, RequestID, ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Status, RequestedAt, Action)
                VALUES (@RecordID, @RequestID, @ResidentName, @NationalID, @PhoneNumber, @Email, @HouseNumber, @CourtName, @RoleName, @Status, @RequestedAt, @Action)
            `);

        res.json({ success: true, message: "Request approved and moved to records successfully" });
    } catch (err) {
        console.error("❌ approveMembershipRequest Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ====================================================
// ADMIN: Reject membership request
// ====================================================
export const rejectMembershipRequest = async (req, res) => {
    const { RequestID } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input("RequestID", sql.Int, RequestID)
            .query("UPDATE MembershipRequests SET Status = 'Rejected' WHERE RequestID = @RequestID");

        res.status(200).json({ success: true, message: "Request rejected successfully" });
    } catch (err) {
        console.error("❌ rejectMembershipRequest Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ====================================================
// ADMIN: Delete membership request
// ====================================================
export const deleteMembershipRequest = async (req, res) => {
    const { RequestID } = req.params;
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input("RequestID", sql.Int, RequestID)
            .query("DELETE FROM MembershipRequests WHERE RequestID = @RequestID");

        if (result.rowsAffected[0] === 0) return res.status(404).json({ success: false, message: "Request not found" });

        res.status(200).json({ success: true, message: "Request deleted successfully" });
    } catch (err) {
        console.error("❌ deleteMembershipRequest Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ====================================================
// ADMIN: Sync MembershipRequests → MembershipRecords
// ====================================================
export const syncMembershipRecords = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const maxRecordResult = await pool.request().query("SELECT ISNULL(MAX(RecordID), 0) AS maxID FROM MembershipRecords");
        const startingRecordID = maxRecordResult.recordset[0].maxID;

        await pool.request()
            .input("StartingID", sql.Int, startingRecordID)
            .query(`
                WITH RequestsToSync AS (
                    SELECT r.RequestID, r.ResidentName, r.NationalID, r.PhoneNumber, r.Email, r.HouseNumber, r.CourtName, r.RoleName, r.Status, r.RequestedAt, r.Action
                    FROM MembershipRequests r
                    WHERE NOT EXISTS (SELECT 1 FROM MembershipRecords m WHERE m.RequestID = r.RequestID)
                ),
                NumberedRequests AS (
                    SELECT *, ROW_NUMBER() OVER (ORDER BY RequestedAt ASC) as RowNum FROM RequestsToSync
                )
                INSERT INTO MembershipRecords
                (RecordID, RequestID, ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Status, RequestedAt, Action)
                SELECT (@StartingID + nr.RowNum) as CalculatedRecordID, nr.RequestID, nr.ResidentName, nr.NationalID, nr.PhoneNumber, nr.Email, nr.HouseNumber, nr.CourtName, nr.RoleName, nr.Status, nr.RequestedAt, nr.Action
                FROM NumberedRequests nr;
            `);

        res.json({ success: true, message: "Membership requests synced successfully." });
    } catch (err) {
        console.error("❌ syncMembershipRecords Error:", err);
        res.status(500).json({ success: false, message: "Sync failed. Check server logs for SQL error." });
    }
};

// ====================================================
// ADMIN: Get all membership records
// ====================================================
export const getAllMembershipRecords = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query("SELECT TOP (1000) * FROM MembershipRecords ORDER BY RequestedAt DESC");
        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("❌ getAllMembershipRecords Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// ====================================================
// ADMIN: Get latest RequestID & RecordID
// ====================================================
export const getLatestMembershipIDs = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT 
                (SELECT ISNULL(MAX(RequestID), 0) FROM MembershipRequests) AS lastRequestID,
                (SELECT ISNULL(MAX(RecordID), 0) FROM MembershipRecords) AS lastRecordID;
        `);
        const { lastRequestID, lastRecordID } = result.recordset[0];
        res.status(200).json({ success: true, lastRequestID, lastRecordID });
    } catch (err) {
        console.error("❌ getLatestMembershipIDs Error:", err);
        res.status(500).json({ success: false, message: "Failed to retrieve latest IDs.", lastRequestID: 0, lastRecordID: 0 });
    }
};
