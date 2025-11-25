// ================================
// controllers/visitorController.js
// ================================

import sql from "mssql";
import { connectDB } from "../config/db.js";

// ================================
// ✅ Register one or multiple visitors
// ================================
export const registerVisitors = async (req, res) => {
  const { ResidentID, ResidentName, visitors } = req.body;

  if (!ResidentID || !ResidentName || !Array.isArray(visitors) || visitors.length === 0) {
    return res.status(400).json({ success: false, message: "Missing or invalid data" });
  }

  try {
    const pool = await connectDB();

    for (const v of visitors) {
      await pool.request()
        .input("ResidentID", sql.Int, ResidentID)
        .input("ResidentName", sql.NVarChar(100), ResidentName)
        .input("VisitorName", sql.NVarChar(100), v.VisitorName)
        .input("NationalID", sql.NVarChar(50), v.NationalID || null)
        .input("PhoneNumber", sql.NVarChar(20), v.PhoneNumber || null)
        .input("VehicleNumber", sql.NVarChar(20), v.VehicleNumber || null)
        .input("Purpose", sql.NVarChar(200), v.Purpose || null)
        .input("DateOfVisit", sql.Date, v.DateOfVisit || new Date())
        .query(`
          INSERT INTO Visitors (
            ResidentID, ResidentName, VisitorName, NationalID,
            PhoneNumber, VehicleNumber, Purpose, DateOfVisit, CreatedAt
          )
          VALUES (
            @ResidentID, @ResidentName, @VisitorName, @NationalID,
            @PhoneNumber, @VehicleNumber, @Purpose, @DateOfVisit, GETDATE()
          )
        `);
    }

    res.json({ success: true, message: "✅ Visitors registered successfully!" });
  } catch (err) {
    console.error("❌ Error registering visitors:", err);
    res.status(500).json({ success: false, message: "Server error during registration" });
  }
};

// ================================
// ✅ Fetch all visitors
// ================================
export const getAllVisitors = async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .query("SELECT * FROM Visitors ORDER BY CreatedAt DESC");
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching visitors:", err);
    res.status(500).json({ success: false, message: "Database fetch error" });
  }
};

// ================================
// ✅ Fetch approved visitors
// ================================
export const getApprovedVisitors = async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT v.VisitorID, v.VisitorName, v.ResidentID, r.ResidentName, v.DateOfVisit AS Date, v.Status
      FROM Visitors v
      JOIN Residents r ON v.ResidentID = r.ResidentID
      WHERE v.Status = 'Approved'
      ORDER BY v.DateOfVisit DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching approved visitors:", err);
    res.status(500).json({ error: "Server error fetching approved visitors" });
  }
};

// ================================
// ✅ Fetch pending visitors
// ================================
export const getPendingVisitors = async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request().query(`
      SELECT v.VisitorID, v.VisitorName, v.ResidentID, r.ResidentName, v.DateOfVisit AS Date, v.Status
      FROM Visitors v
      JOIN Residents r ON v.ResidentID = r.ResidentID
      WHERE v.Status = 'Pending'
      ORDER BY v.DateOfVisit DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching pending visitors:", err);
    res.status(500).json({ error: "Server error fetching pending visitors" });
  }
};

// ================================
// ✅ Get visitor count for dashboard
// ================================
export const getVisitorCount = async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .query("SELECT COUNT(*) AS totalVisitors FROM Visitors");
    res.json({ totalVisitors: result.recordset[0].totalVisitors });
  } catch (err) {
    console.error("❌ Error counting visitors:", err);
    res.status(500).json({ success: false, message: "Count fetch error" });
  }
};

// ================================
// ✅ Fetch visitor by ID
// ================================
export const getVisitorById = async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await connectDB();
    const result = await pool.request()
      .input("VisitorID", sql.Int, id)
      .query("SELECT * FROM Visitors WHERE VisitorID = @VisitorID");

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, message: "Visitor not found" });
    }

    res.json({ success: true, data: result.recordset[0] });
  } catch (err) {
    console.error("❌ Error fetching visitor by ID:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ================================
// ✅ Fetch visitor requests (all requests)
// For routes like GET /api/visitors/requests
// ================================
export const getVisitorRequests = async (req, res) => {
  try {
    const pool = await connectDB();
    const result = await pool.request()
      .query(`
        SELECT v.VisitorID, v.VisitorName, v.ResidentID, r.ResidentName, v.DateOfVisit, v.Status, v.CreatedAt
        FROM Visitors v
        JOIN Residents r ON v.ResidentID = r.ResidentID
        ORDER BY v.CreatedAt DESC
      `);

    res.status(200).json(result.recordset);
  } catch (err) {
    console.error("❌ Error fetching visitor requests:", err);
    res.status(500).json({ success: false, message: "Server error fetching visitor requests" });
  }
};
