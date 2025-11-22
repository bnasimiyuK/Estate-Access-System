// ==========================================
// backend/controllers/membershiprecordsController.js
// ==========================================
import sql from "mssql";
import dbConfig from "../config/dbConfig.js";

// 🟢 SYNC MEMBERSHIP RECORDS (requests → records)
export const syncMembershipRecords = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);

    // Fetch all pending membership requests
    const requestsResult = await pool.request().query(`
      SELECT RequestID, ResidentName, NationalID, PhoneNumber, Email,
             HouseNumber, CourtName, RoleName, Status, RequestedAt
      FROM MembershipRequests
      WHERE Status = 'Pending'
    `);

    const requests = requestsResult.recordset;
    let syncCount = { inserted: 0, skipped: 0 };

    for (const r of requests) {
      // Skip if record already exists
      const existing = await pool
        .request()
        .input("RequestID", sql.Int, r.RequestID)
        .query("SELECT 1 FROM MembershipRecords WHERE RequestID=@RequestID");

      if (existing.recordset.length > 0) {
        syncCount.skipped++;
        continue;
      }

      // Insert into MembershipRecords
      await pool
        .request()
        .input("RequestID", sql.Int, r.RequestID)
        .input("ResidentName", sql.NVarChar, r.ResidentName)
        .input("NationalID", sql.NVarChar, r.NationalID)
        .input("PhoneNumber", sql.NVarChar, r.PhoneNumber)
        .input("Email", sql.NVarChar, r.Email)
        .input("HouseNumber", sql.NVarChar, r.HouseNumber)
        .input("CourtName", sql.NVarChar, r.CourtName)
        .input("RoleName", sql.NVarChar, r.RoleName)
        .input("Status", sql.NVarChar, r.Status)
        .input("RequestedAt", sql.DateTime, r.RequestedAt)
        .query(`
          INSERT INTO MembershipRecords
          (RequestID, ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Status, RequestedAt)
          VALUES (@RequestID,@ResidentName,@NationalID,@PhoneNumber,@Email,@HouseNumber,@CourtName,@RoleName,@Status,@RequestedAt)
        `);

      syncCount.inserted++;
    }

    res.json({ success: true, message: "Sync completed", syncCount });
  } catch (error) {
    console.error("❌ Sync error:", error);
    res.status(500).json({ success: false, message: `Sync failed: ${error.message}` });
  }
};

// 📋 GET ALL MEMBERSHIP RECORDS
export const getAllMembershipRecords = async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query("SELECT * FROM MembershipRecords ORDER BY RequestedAt DESC");
    res.json({ success: true, records: result.recordset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ APPROVE MEMBERSHIP RECORD
export const approveMembershipRecord = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await sql.connect(dbConfig);

    await pool.request().input("RequestID", sql.Int, id).query(`
      UPDATE MembershipRecords SET Status='Approved' WHERE RequestID=@RequestID;
      UPDATE MembershipRequests SET Status='Approved' WHERE RequestID=@RequestID;
    `);

    res.json({ success: true, message: `Record ${id} approved` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ❌ REJECT MEMBERSHIP RECORD
export const rejectMembershipRecord = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await sql.connect(dbConfig);

    await pool.request().input("RequestID", sql.Int, id).query(`
      UPDATE MembershipRecords SET Status='Rejected' WHERE RequestID=@RequestID;
      UPDATE MembershipRequests SET Status='Rejected' WHERE RequestID=@RequestID;
    `);

    res.json({ success: true, message: `Record ${id} rejected` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🗑️ DELETE MEMBERSHIP RECORD
export const deleteMembershipRecord = async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await sql.connect(dbConfig);
    await pool.request().input("RequestID", sql.Int, id).query("DELETE FROM MembershipRecords WHERE RequestID=@RequestID");
    res.json({ success: true, message: `Record ${id} deleted` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
