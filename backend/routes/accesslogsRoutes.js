// backend/routes/accesslogsRoutes.js
import express from "express";
import sql from "mssql";
import dbConfig from "../config/dbConfig.js";
import { Parser } from "json2csv";
import { verifyToken } from "./authRoutes.js"; // JWT middleware

const router = express.Router();

// ================================
// Protect all routes with JWT
// ================================
router.use(verifyToken);

// ================================
// GET: Fetch access logs with optional filters
// Supports: userId, action, fromDate, toDate, limit
// ================================
router.get("/", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const { userId, action, fromDate, toDate, limit } = req.query;
    const maxRows = parseInt(limit || "500", 10);

    let query = `
      SELECT TOP (@maxRows)
        Id,
        TimestampUtc AS timestamp,
        UserId,
        Action AS action,
        Resource AS gate,
        IpAddress AS ipAddress,
        UserAgent AS userAgent,
        Status AS status,
        Reason AS reason
      FROM AccessLogs
      WHERE 1=1
    `;

    if (userId) query += ` AND UserId = ${parseInt(userId)}`;
    if (action) query += ` AND Action LIKE '%${action}%'`;
    if (fromDate) query += ` AND TimestampUtc >= '${fromDate}'`;
    if (toDate) query += ` AND TimestampUtc <= '${toDate}'`;

    query += " ORDER BY TimestampUtc DESC";

    const result = await pool.request()
      .input("maxRows", sql.Int, maxRows)
      .query(query);

    res.json(result.recordset);

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ================================
// GET: Download CSV of access logs (basic fields)
// ================================
router.get("/download/csv", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT TOP 500
        TimestampUtc AS timestamp,
        UserId,
        Action AS action,
        Resource AS gate,
        IpAddress AS ipAddress,
        UserAgent AS userAgent,
        Status AS status,
        Reason AS reason
      FROM AccessLogs
      ORDER BY TimestampUtc DESC
    `);

    const fields = ["timestamp","UserId","action","gate","ipAddress","userAgent","status","reason"];
    const parser = new Parser({ fields });
    const csv = parser.parse(result.recordset);

    res.header("Content-Type", "text/csv");
    res.attachment("access_logs.csv");
    res.send(csv);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ================================
// GET: Export CSV with extended fields (Referrer, Metadata)
// ================================
router.get("/export/csv", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT TOP 500
        TimestampUtc AS timestamp,
        UserId,
        Action AS action,
        Resource AS gate,
        IpAddress AS ipAddress,
        UserAgent AS userAgent,
        Status AS status,
        Reason AS reason,
        Referrer,
        Metadata
      FROM AccessLogs
      ORDER BY TimestampUtc DESC
    `);

    const parser = new Parser();
    const csv = parser.parse(result.recordset);

    res.header("Content-Type", "text/csv");
    res.attachment("access_logs_extended.csv");
    res.send(csv);

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
