import express from "express";
import sql from "mssql";
import { authenticateJWT, isAdmin } from "../middleware/authMiddleware.js";
import { dbPool } from "../server.js";

const router = express.Router();

/* ============================================================
   DASHBOARD SUMMARY
=============================================================== */
router.get("/dashboard/summary", authenticateJWT, isAdmin, async (req, res) => {
    try {
        const pool = await dbPool;

        const result = await pool.request().query(`
            SELECT
                (SELECT COUNT(*) FROM Residents WHERE Status='Approved') AS TotalResidents,
                (SELECT COUNT(*) FROM Visitors) AS TotalVisitors,
                (SELECT COUNT(*) FROM AccessLogs) AS TotalAccessLogs,
                (SELECT COUNT(*) FROM MembershipRequests WHERE Status='Pending') AS PendingRequests
        `);

        res.status(200).json(result.recordset[0]);
    } catch (error) {
        console.error("Error loading dashboard summary:", error);
        res.status(500).json({ message: "Server error" });
    }
});

/* ============================================================
   ACCESS CHART
=============================================================== */
router.get("/dashboard/accesschart", authenticateJWT, isAdmin, async (req, res) => {
    try {
        const pool = await dbPool;

        const result = await pool.request().query(`
            SELECT 
                FORMAT(AccessTime, 'yyyy-MM') AS Month,
                COUNT(*) AS TotalAccess
            FROM AccessLogs
            GROUP BY FORMAT(AccessTime, 'yyyy-MM')
            ORDER BY Month
        `);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error("Error fetching access chart:", error);
        res.status(500).json({ message: "Server error" });
    }
});

/* ============================================================
   APPROVED RESIDENTS
=============================================================== */
router.get("/residents/approved", authenticateJWT, isAdmin, async (req, res) => {
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

/* ============================================================
   PENDING MEMBERSHIP REQUESTS
=============================================================== */
router.get("/residents/pending", authenticateJWT, isAdmin, async (req, res) => {
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
