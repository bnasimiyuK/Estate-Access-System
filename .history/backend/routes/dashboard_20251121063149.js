import express from "express";
import sql from "mssql";
import { dbConfig } from "../db.js";
import { verifyToken, isAdmin } from "../middleware/authMiddleware.js";
const router = express.Router();

/* -------------------------------------------
   1️⃣ DASHBOARD SUMMARY API
-------------------------------------------- */
router.get("/summary", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);

    const result = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM Residents) AS totalResidents,
        (SELECT COUNT(*) FROM Residents WHERE Status = 'Approved') AS approvedResidents,
        (SELECT COUNT(*) FROM Visitors) AS totalVisitors,
        (SELECT COUNT(*) FROM VisitorCheckInOut WHERE CheckoutTime IS NULL) AS visitorsCheckedIn,
        (SELECT COUNT(*) FROM VisitorCheckInOut WHERE CheckoutTime IS NOT NULL) AS visitorsCheckedOut
    `);

    res.json(result.recordset[0]);
  } catch (err) {
    console.error("Summary API Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


/* -------------------------------------------
   2️⃣ ACCESS CHART API (visitors per hour)
-------------------------------------------- */
router.get("/chart", async (req, res) => {
  try {
    const pool = await sql.connect(dbConfig);

    const query = `
      SELECT 
        DATEPART(HOUR, CheckinTime) AS hour,
        COUNT(*) AS total
      FROM Visitors
      WHERE CheckinTime IS NOT NULL
      GROUP BY DATEPART(HOUR, CheckinTime)
      ORDER BY hour ASC
    `;

    const result = await pool.request().query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error("Access Chart API Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
router.get("/summary", verifyToken, isAdmin, getDashboardSummary);
export default router;
