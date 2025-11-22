// backend/controllers/accessController.js
import sql from "mssql";
import dbConfig from "../config/dbConfig.js";
const AccessLog = require('../models/AccessLog');
const Payment = require('../models/Payment');

// Handle access attempt
export async function handleAccessAttempt(req, res) {
  try {
    const { ResidentID, UserType, Action } = req.body;
    if (!UserType || !Action) return res.status(400).json({ message: 'Missing fields' });

    let result = 'Denied';
    if (UserType === 'resident' && ResidentID) {
      const latest = await Payment.verifyPayment(ResidentID);
      if (latest && latest.Status === 'Paid') result = 'Granted';
    }

    await AccessLog.logAccessAttempt({ UserType, UserID: ResidentID || null, Action, Result: result });
    res.json({ success: true, result });
  } catch (err) {
    console.error("Error handling access attempt:", err);
    res.status(500).json({ message: 'Access error' });
  }
}

// Fetch access logs using AccessLog model
export async function getAccessLogs(req, res) {
  try {
    // If using model
    if (AccessLog.getAllLogs) {
      const logs = await AccessLog.getAllLogs();
      return res.json(logs);
    }

    // Fallback: fetch directly from database using mssql
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT AccessID, UserName, Action, Date
      FROM AccessLogs
      ORDER BY Date DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error("Error fetching access logs:", error);
    res.status(500).json({ message: "Server error" });
  }
}
