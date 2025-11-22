// ==========================================
// controllers/membershipController.js
// Unified controller for Residents + Admins
// Handles Membership Requests and Records
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
// RESIDENT / ADMIN: Submit membership request
// ====================================================
// ==========================================
// controllers/membershipController.js
// FIXED & UPDATED submitMembershipRequest
// ==========================================

import sql from "mssql";
import dbConfig from "../config/dbConfig.js";

export const submitMembershipRequest = async (req, res) => {
  const {
    RequestID,        // NEW: RequestID now required
    ResidentName,
    NationalID,
    PhoneNumber,
    Email,
    HouseNumber,
    CourtName,
    Action,
  } = req.body;

  const userId = req.user?.id;
  const role = req.user?.role;

  try {
    // ==========================================
    // VALIDATION
    // ==========================================

    // 1️⃣ Validate required fields
    if (
      !ResidentName ||
      !NationalID ||
      !PhoneNumber ||
      !Email ||
      !HouseNumber ||
      !CourtName
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // 2️⃣ Validate RequestID
    if (!RequestID || isNaN(parseInt(RequestID))) {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid RequestID",
      });
    }

    // 3️⃣ Validate roles allowed
    if (!["resident", "admin"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Only residents or admins can submit requests",
      });
    }

    // ==========================================
    // INSERT MEMBERSHIP REQUEST
    // ==========================================
    const pool = await sql.connect(dbConfig);

    await pool
      .request()
      .input("RequestID", sql.Int, parseInt(RequestID))
      .input("UserID", sql.Int, userId)
      .input("ResidentName", sql.NVarChar(100), ResidentName)
      .input("NationalID", sql.NVarChar(50), NationalID)
      .input("PhoneNumber", sql.NVarChar(50), PhoneNumber)
      .input("Email", sql.NVarChar(100), Email)
      .input("HouseNumber", sql.NVarChar(50), HouseNumber)
      .input("CourtName", sql.NVarChar(50), CourtName)
      .input("Status", sql.NVarChar(50), "Pending")
      .input("RequestedAt", sql.DateTime, new Date())
      .input("RoleName", sql.NVarChar(50), role)
      .input("Action", sql.NVarChar(50), Action || null)
      .query(`
        INSERT INTO MembershipRequests
          (RequestID, UserID, ResidentName, NationalID, PhoneNumber, Email, 
           HouseNumber, CourtName, Status, RequestedAt, RoleName, Action)
        VALUES 
          (@RequestID, @UserID, @ResidentName, @NationalID, @PhoneNumber, @Email, 
           @HouseNumber, @CourtName, @Status, @RequestedAt, @RoleName, @Action)
      `);

    // ==========================================
    // SUCCESS
    // ==========================================
    return res.status(200).json({
      success: true,
      message: "Membership request submitted successfully",
    });
  } catch (err) {
    console.error("❌ submitMembershipRequest Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};


// ====================================================
// ADMIN: View all membership requests
// ====================================================
export const getAllMembershipRequests = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool
      .request()
      .query("SELECT TOP (1000) * FROM MembershipRequests ORDER BY RequestedAt DESC");

    res.status(200).json({ success: true, data: result.recordset });
  } catch (err) {
    console.error("❌ getAllMembershipRequests Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ====================================================
// ADMIN: Approve membership request
// ====================================================
// ==========================================
// ADMIN: Approve membership request (FINAL VERSION)
// ==========================================
// ====================================================
// ADMIN: Approve membership request (FINAL FIX)
// ====================================================
export const approveMembershipRequest = async (req, res) => {
 const { RequestID } = req.params;

 try {
  const pool = await sql.connect(dbConfig);

  // 1. Get request details
  const requestResult = await pool
   .request()
   .input("RequestID", sql.Int, RequestID)
   .query("SELECT * FROM MembershipRequests WHERE RequestID = @RequestID");

  if (requestResult.recordset.length === 0) {
   return res.status(404).json({ success: false, message: "Request not found" });
  }

  const r = requestResult.recordset[0];

    // 2. 🔥 MANUALLY CALCULATE NEXT RecordID (CRITICAL FIX)
    // Since RecordID is NOT IDENTITY, we must fetch MAX and increment it.
    const maxRecordResult = await pool.request().query(
        "SELECT ISNULL(MAX(RecordID), 0) AS maxID FROM MembershipRecords"
    );
    const nextRecordID = maxRecordResult.recordset[0].maxID + 1;
    
  // 3. Update status to Approved
  await pool
   .request()
   .input("RequestID", sql.Int, RequestID)
   .query("UPDATE MembershipRequests SET Status = 'Approved' WHERE RequestID = @RequestID");

  // 4. Move approved request into MembershipRecords
  await pool
   .request()
   .input("RequestID", sql.Int, RequestID)
      .input("RecordID", sql.Int, nextRecordID) // <-- NEW: Input the calculated ID
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
   `); // <-- RecordID added to column list and values

  res.json({
   success: true,
   message: "Request approved and moved to records successfully",
  });
 } catch (err) {
  console.error("❌ approveMembershipRequest Error:", err);
  res.status(500).json({ success: false, message: "Server error" });
 }
};

// ====================================================
// ADMIN: Sync MembershipRequests → MembershipRecords
// ====================================================
// ====================================================
// ADMIN: Sync MembershipRequests → MembershipRecords
// 💥 FIXED: Auto-generates unique sequential RecordID
// ====================================================
// ====================================================
// ADMIN: Sync MembershipRequests → MembershipRecords
// 💥 FIXED: Ensure StartingID is correctly passed and used in the SQL CTE.
// ====================================================
export const syncMembershipRecords = async (req, res) => {
 try {
  const pool = await sql.connect(dbConfig);

    // 1. Fetch the current maximum RecordID (This part is correct)
    const maxRecordResult = await pool.request().query(
        "SELECT ISNULL(MAX(RecordID), 0) AS maxID FROM MembershipRecords"
    );
    const startingRecordID = maxRecordResult.recordset[0].maxID;

  // 2. Perform the bulk insert using the startingRecordID to offset the Row Number.
  const syncResult = await pool
        .request()
        // 🔥 CRITICAL: Define the SQL input variable for the CTE
        .input("StartingID", sql.Int, startingRecordID) 
        .query(`
            -- CTE to identify requests that need to be synced
            WITH RequestsToSync AS (
                SELECT 
                    r.RequestID, 
                    r.ResidentName, 
                    r.NationalID, 
                    r.PhoneNumber, 
                    r.Email, 
                    r.HouseNumber, 
                    r.CourtName, 
                    r.RoleName, 
                    r.Status, 
                    r.RequestedAt, 
                    r.Action
                FROM MembershipRequests r
                WHERE NOT EXISTS (
                    SELECT 1 FROM MembershipRecords m WHERE m.RequestID = r.RequestID
                )
            ),
            -- CTE to assign a sequential row number to the new records
            NumberedRequests AS (
                SELECT 
                    *,
                    -- RowNum starts at 1, 2, 3...
                    ROW_NUMBER() OVER (ORDER BY RequestedAt ASC) as RowNum
                FROM RequestsToSync
            )
            -- Final Insert statement
        INSERT INTO MembershipRecords
        (RecordID, RequestID, ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Status, RequestedAt, Action)
        SELECT 
                (@StartingID + nr.RowNum) as CalculatedRecordID, -- Calculate new unique ID: MAX(ID) + RowNum
                nr.RequestID, 
                nr.ResidentName, 
                nr.NationalID, 
                nr.PhoneNumber, 
                nr.Email, 
                nr.HouseNumber, 
                nr.CourtName, 
                nr.RoleName, 
                nr.Status, 
                nr.RequestedAt, 
                nr.Action
        FROM NumberedRequests nr;
  `);
    
    // Log the number of records inserted for confirmation
    const rowsInserted = syncResult.rowsAffected[0];

  res.json({ 
        success: true, 
        message: `${rowsInserted} record(s) synced successfully.` 
    });

 } catch (err) {
  console.error("❌ syncMembershipRecords Error:", err);
  res.status(500).json({ success: false, message: "Sync failed. Check server logs for SQL error." });
 }
};


// ====================================================
// ADMIN: Get latest RequestID and RecordID for frontend
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

    res.status(200).json({
      success: true,
      lastRequestID,
      lastRecordID
    });

  } catch (err) {
    console.error("❌ getLatestMembershipIDs Error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve latest IDs.",
      lastRequestID: 0,
      lastRecordID: 0
    });
  }
};
