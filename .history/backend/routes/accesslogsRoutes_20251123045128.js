// routes/accessLogsRoutes.js
import { Router } from "express";
import { dbPool } from "../server.js";
import sql from "mssql";
import { authenticateJWT, isAdmin } from "../middleware/authMiddleware.js";
// backend/routes/accessLogsRoutes.js
import { getAccessLogs } from "../controllers/accessLogsController.js";

const router = Router();

// GET /api/access/logs?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/logs", authenticateJWT, isAdmin, async (req, res) => {
    try {
        const { from, to } = req.query;

        let query = `
            SELECT TOP (1000)
                [id],
                [timestampUtc],
                [userId],
                [action],
                [resource],
                [ipAddress],
                [userAgent],
                [referrer],
                [metadata],
                [logType]
            FROM [EstateAccessManagementSystem].[dbo].[accesslogs]
        `;

        if (from && to) {
            query += " WHERE CAST(timestampUtc AS DATE) BETWEEN @from AND @to";
        }

        query += " ORDER BY timestampUtc DESC";

        const request = dbPool.request();
        if (from && to) {
            request.input("from", sql.Date, from);
            request.input("to", sql.Date, to);
        }

        const result = await request.query(query);
        res.json(result.recordset);

    } catch (err) {
        console.error("Access logs fetch error:", err);
        res.status(500).json({ message: "Failed to fetch access logs", details: err.message });
    }
});
// Admin only
router.get("/logs", authenticateJWT, isAdmin, getAccessLogs);
export default router;





