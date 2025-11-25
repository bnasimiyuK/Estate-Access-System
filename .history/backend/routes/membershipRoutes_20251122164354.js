import express from "express";
import sql from "mssql";
import { dbPool } from "../server.js";

const router = express.Router();

// ======================================
// GET ALL MEMBERSHIP RECORDS
// ======================================
router.get("/all", async (req, res) => {
  try {
    const pool = await dbPool;
    const result = await pool.request().query(`
      SELECT *
      FROM MembershipRecords
      ORDER BY RequestedAt DESC
    `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Error fetching membership records:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ======================================
// GET PENDING MEMBERSHIP REQUESTS
// ======================================
router.get("/requests/pending", async (req, res) => {
  try {
    const pool = await dbPool;
    const result = await pool.request().query(`
      SELECT *
      FROM MembershipRecords
      WHERE Status = 'Pending'
      ORDER BY RequestedAt DESC
    `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Error fetching pending requests:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ======================================
// GET APPROVED RESIDENTS
// ======================================
router.get("/residents/approved", async (req, res) => {
  try {
    const pool = await dbPool;

    const result = await pool.request().query(`
      SELECT ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName
      FROM MembershipRecords
      WHERE Status = 'Approved'
      ORDER BY ApprovedAt DESC
    `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("Error fetching approved residents:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ======================================
// SYNC NEW REQUESTS → MEMBERSHIP RECORDS
// ======================================
router.post("/sync", async (req, res) => {
  try {
    const pool = await dbPool;

    await pool.request().query(`
      INSERT INTO MembershipRecords
      (RequestID, ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Status, RequestedAt)
      SELECT RequestID, ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, Status, RequestedAt
      FROM MembershipRequests
      WHERE RequestID NOT IN (SELECT RequestID FROM MembershipRecords)
    `);

    res.status(200).json({ message: "Sync completed" });
  } catch (err) {
    console.error("Error syncing records:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
