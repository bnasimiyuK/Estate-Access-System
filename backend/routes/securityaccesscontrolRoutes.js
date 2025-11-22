// backend/routes/visitorsAccessRoutes.js
// Handles grouped visitor registration, approvals (Level1 & Level2), rejection, check-in/check-out

import express from "express";
import sql from "mssql";
import crypto from "crypto";
import { verifyToken } from "../middleware/verifyToken.js"; // adjusted to your preferred import

const router = express.Router();

// ====== DB CONFIG ======
// Prefer setting these in environment variables in production.
const dbConfig = {
  user: process.env.DB_USER || "Beverly",
  password: process.env.DB_PASSWORD || "Bev@1234567",
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_NAME || "EstateAccessManagementSystem",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// ====== Utility function to run SQL queries ======
async function runQuery(query, params = []) {
  let pool;
  try {
    pool = await sql.connect(dbConfig);
    const request = pool.request();
    params.forEach((p) => request.input(p.name, p.type, p.value));
    const result = await request.query(query);
    return result;
  } catch (err) {
    console.error("SQL Query Error:", err);
    throw err;
  } finally {
    try {
      if (pool) await pool.close();
    } catch (closeErr) {
      console.error("Error closing SQL pool:", closeErr);
    }
  }
}

// ==========================
// GET Pending Visitors (Admin L1)
// ==========================
router.get("/pending", verifyToken, async (req, res) => {
  try {
    const result = await runQuery(`
      SELECT *
      FROM VisitorsAccess
      WHERE Level1Approval = 'Pending'
      ORDER BY DateOfVisit ASC
    `);
    res.json({ success: true, requests: result.recordset });
  } catch (err) {
    console.error("Pending Visitors Error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching pending visitors." });
  }
});

// ==========================
// GET Visitors Level1 Approved & Level2 Pending (Security L2 dashboard)
// ==========================
router.get("/level2/pending", verifyToken, async (req, res) => {
  try {
    const result = await runQuery(`
      SELECT *
      FROM VisitorsAccess
      WHERE Level1Approval = 'Approved' AND Level2Approval = 'Pending'
      ORDER BY DateOfVisit ASC
    `);
    res.json({ success: true, visitors: result.recordset });
  } catch (err) {
    console.error("Level2 Pending Visitors Error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching Level2 pending visitors." });
  }
});

// ==========================
// GET Approved Visitors (Level1 & Level2)
// ==========================
router.get("/approved", verifyToken, async (req, res) => {
  try {
    const result = await runQuery(`
      SELECT *
      FROM VisitorsAccess
      WHERE Level1Approval = 'Approved' AND Level2Approval = 'Approved'
      ORDER BY DateOfVisit ASC
    `);
    res.json({ success: true, approved: result.recordset });
  } catch (err) {
    console.error("Approved Visitors Error:", err);
    res.status(500).json({ success: false, message: "Server error while fetching approved visitors." });
  }
});

// ==========================
// Register New Visitors (Grouped)
// ==========================
router.post("/register", verifyToken, async (req, res) => {
  try {
    const { ResidentID, ResidentName, CourtName, HouseNumber, DateOfVisit, CreatedByRole, VisitorList, AdditionalNotes } = req.body;

    if (!ResidentID || !ResidentName || !CourtName || !HouseNumber)
      return res.status(400).json({ success: false, message: "Missing resident or address information." });

    if (!VisitorList || !Array.isArray(VisitorList) || VisitorList.length === 0)
      return res.status(400).json({ success: false, message: "VisitorList must be a non-empty array." });

    const visitorListJson = JSON.stringify(VisitorList);
    const groupCount = VisitorList.length;
    const visitDate = DateOfVisit ? new Date(DateOfVisit) : new Date();

    await runQuery(`
      INSERT INTO VisitorsAccess
      (ResidentID, ResidentName, CourtName, HouseNumber, GroupCount, VisitorList, DateOfVisit, CreatedByRole, Level1Approval, Level2Approval, Status, AdditionalNotes)
      VALUES
      (@ResidentID, @ResidentName, @CourtName, @HouseNumber, @GroupCount, @VisitorList, @DateOfVisit, @CreatedByRole, 'Pending', 'Pending', 'Pending', @AdditionalNotes)
    `, [
      { name: "ResidentID", type: sql.Int, value: ResidentID },
      { name: "ResidentName", type: sql.NVarChar, value: ResidentName },
      { name: "CourtName", type: sql.NVarChar, value: CourtName },
      { name: "HouseNumber", type: sql.NVarChar, value: HouseNumber },
      { name: "GroupCount", type: sql.Int, value: groupCount },
      { name: "VisitorList", type: sql.NVarChar(sql.MAX), value: visitorListJson },
      { name: "DateOfVisit", type: sql.DateTime, value: visitDate },
      { name: "CreatedByRole", type: sql.NVarChar, value: CreatedByRole || "resident" },
      { name: "AdditionalNotes", type: sql.NVarChar, value: AdditionalNotes || "" },
    ]);

    res.json({ success: true, message: "Visitor group registered successfully." });
  } catch (err) {
    console.error("Register Visitors Error:", err);
    res.status(500).json({ success: false, message: "Server error while registering visitors." });
  }
});

// ==========================
// Admin Level1 Approval
// ==========================
router.patch("/approve/level1/:visitorId", verifyToken, async (req, res) => {
  const { visitorId } = req.params;
  const { approvedByID, approvedByName } = req.body;

  if (!approvedByID || !approvedByName) return res.status(400).json({ success: false, message: "Missing approver information." });

  try {
    await runQuery(`
      UPDATE VisitorsAccess
      SET Level1Approval = 'Approved',
          Level1ApprovedBy = @ApprovedByName,
          Level1ApprovedByID = @ApprovedByID,
          Level1ApprovedAt = GETDATE(),
          Status = 'Pending-L2'
      WHERE VisitorAccessID = @VisitorAccessID
    `, [
      { name: "VisitorAccessID", type: sql.Int, value: visitorId },
      { name: "ApprovedByID", type: sql.Int, value: approvedByID },
      { name: "ApprovedByName", type: sql.NVarChar, value: approvedByName },
    ]);

    res.json({ success: true, message: "Visitor group approved by Admin (L1) and forwarded to Security (L2)." });
  } catch (err) {
    console.error("Level 1 Approval Error:", err);
    res.status(500).json({ success: false, message: "Server error during Level 1 approval." });
  }
});

// ==========================
// Security Level2 Approval
// ==========================
router.patch("/approve/level2/:visitorId", verifyToken, async (req, res) => {
  const { visitorId } = req.params;
  const { approvedByID, approvedByName } = req.body;

  if (!approvedByID || !approvedByName) return res.status(400).json({ success: false, message: "Missing approver information." });

  try {
    const accessCode = crypto.randomBytes(3).toString("hex").toUpperCase();

    await runQuery(`
      UPDATE VisitorsAccess
      SET Level2Approval = 'Approved',
          Level2ApprovedBy = @ApprovedByName,
          Level2ApprovedByID = @ApprovedByID,
          Level2ApprovedAt = GETDATE(),
          Status = 'Approved',
          AccessCode = @AccessCode
      WHERE VisitorAccessID = @VisitorAccessID
    `, [
      { name: "VisitorAccessID", type: sql.Int, value: visitorId },
      { name: "ApprovedByID", type: sql.Int, value: approvedByID },
      { name: "ApprovedByName", type: sql.NVarChar, value: approvedByName },
      { name: "AccessCode", type: sql.NVarChar, value: accessCode },
    ]);

    res.json({ success: true, message: "Visitor group approved by Security (L2).", accessCode });
  } catch (err) {
    console.error("Level 2 Approval Error:", err);
    res.status(500).json({ success: false, message: "Server error during Level 2 approval." });
  }
});

// ==========================
// Reject Visitor Group
// ==========================
router.patch("/reject/:visitorId", verifyToken, async (req, res) => {
  const { visitorId } = req.params;
  const { rejectedByID, rejectedByName, reason } = req.body || {};

  try {
    await runQuery(`
      UPDATE VisitorsAccess
      SET Level1Approval = 'Rejected',
          Level2Approval = 'Rejected',
          Status = 'Rejected',
          RejectedAt = GETDATE(),
          RejectedByID = @RejectedByID,
          RejectedByName = @RejectedByName,
          RejectionReason = @Reason
      WHERE VisitorAccessID = @VisitorAccessID
    `, [
      { name: "VisitorAccessID", type: sql.Int, value: visitorId },
      { name: "RejectedByID", type: sql.Int, value: rejectedByID || null },
      { name: "RejectedByName", type: sql.NVarChar, value: rejectedByName || "" },
      { name: "Reason", type: sql.NVarChar, value: reason || "" },
    ]);

    res.json({ success: true, message: "Visitor group rejected successfully." });
  } catch (err) {
    console.error("Reject Visitor Error:", err);
    res.status(500).json({ success: false, message: "Server error rejecting visitor group." });
  }
});

// ==========================
// Visitor Check-In
// ==========================
router.post("/checkin", async (req, res) => {
  const { accessCode } = req.body;
  if (!accessCode) return res.status(400).json({ success: false, message: "Access code required." });

  try {
    const result = await runQuery(`SELECT TOP (1) * FROM VisitorsAccess WHERE AccessCode = @AccessCode`, [
      { name: "AccessCode", type: sql.NVarChar, value: accessCode },
    ]);

    if (!result.recordset.length) return res.status(404).json({ success: false, message: "Visitor group not found." });

    const visitor = result.recordset[0];
    if (visitor.Status === "CheckedIn") return res.status(400).json({ success: false, message: "Visitor group already checked in." });
    if (visitor.Status === "Rejected") return res.status(400).json({ success: false, message: "Visitor group was rejected." });
    if (visitor.Level2Approval !== "Approved") return res.status(400).json({ success: false, message: "Visitor group is not approved for check-in." });

    await runQuery(`UPDATE VisitorsAccess SET Status = 'CheckedIn', CheckInTime = GETDATE() WHERE VisitorAccessID = @VisitorAccessID`, [
      { name: "VisitorAccessID", type: sql.Int, value: visitor.VisitorAccessID },
    ]);

    res.json({ success: true, message: "Visitor group checked in successfully." });
  } catch (err) {
    console.error("Check-In Error:", err);
    res.status(500).json({ success: false, message: "Server error during check-in." });
  }
});

// ==========================
// Visitor Check-Out
// ==========================
router.post("/checkout", async (req, res) => {
  const { accessCode } = req.body;
  if (!accessCode) return res.status(400).json({ success: false, message: "Access code required." });

  try {
    const result = await runQuery(`SELECT TOP (1) * FROM VisitorsAccess WHERE AccessCode = @AccessCode`, [
      { name: "AccessCode", type: sql.NVarChar, value: accessCode },
    ]);

    if (!result.recordset.length) return res.status(404).json({ success: false, message: "Visitor group not found." });

    const visitor = result.recordset[0];
    if (visitor.Status === "CheckedOut") return res.status(400).json({ success: false, message: "Visitor group already checked out." });
    if (visitor.Status !== "CheckedIn") return res.status(400).json({ success: false, message: "Visitor group is not checked in." });

    await runQuery(`UPDATE VisitorsAccess SET Status = 'CheckedOut', CheckOutTime = GETDATE() WHERE VisitorAccessID = @VisitorAccessID`, [
      { name: "VisitorAccessID", type: sql.Int, value: visitor.VisitorAccessID },
    ]);

    res.json({ success: true, message: "Visitor group checked out successfully." });
  } catch (err) {
    console.error("Check-Out Error:", err);
    res.status(500).json({ success: false, message: "Server error during check-out." });
  }
});

export default router;
