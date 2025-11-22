import express from "express";
import sql from "mssql";
import { authenticateJWT, isAdmin } from "../middleware/authMiddleware.js";
import { dbPool } from "../server.js";

const router = express.Router();

/**
 * @route GET /api/admin/residents/approved
 * @desc Fetch all approved residents
 * @access Admin only
 */
router.get("/approved", authenticateJWT, isAdmin, async (req, res) => {
    try {
        const pool = await dbPool;
        const result = await pool.request().query(`
            SELECT ResidentID, ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName 
            FROM Residents
            WHERE Status = 'Approved'
        `);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error("Error fetching approved residents:", error);
        res.status(500).json({ message: "Server error" });
    }
});
router.get("/pending", authenticateJWT, isAdmin, async (req, res) => {
  try {
    const pool = await dbPool;
    const result = await pool.request().query(`
      SELECT RequestID, ResidentName, NationalID, PhoneNumber, Email,
             HouseNumber, CourtName, RoleName, Status, RequestedAt
      FROM MembershipRequests
      WHERE Status = 'Pending'
      ORDER BY RequestedAt DESC
    `);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({ message: "Server error" });
  }
});
export default router;
