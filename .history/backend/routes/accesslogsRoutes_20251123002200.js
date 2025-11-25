// backend/routes/accessLogsRoutes.js
import { Router } from "express";
import { dbPool } from "../server.js";
import { authenticateJWT, isAdmin } from "../middleware/authMiddleware.js";

const router = Router();

// GET /api/access/logs?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/logs", authenticateJWT, isAdmin, async (req, res) => {
    try {
        const { from, to } = req.query;
        let query = `SELECT TOP (1000)
            [Id],
            [TimestampUtc],
            [UserId],
            [Action],
            [Resource],
            [IpAddress],
            [UserAgent],
            [Referrer],
            [Metadata],
            [LogType]
        FROM [EstateAccessManagementSystem].[dbo].[accesslogs]`;
        
        if (from && to) {
            query += " WHERE CAST(TimestampUtc AS DATE) BETWEEN @from AND @to";
        }
        query += " ORDER BY TimestampUtc DESC";

        const pool = await dbPool;
        const request = pool.request();
        if (from && to) {
            request.input("from", "Date", from);
            request.input("to", "Date", to);
        }

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error("Access logs error:", err);
        res.status(500).json({ message: "Failed to fetch access logs", details: err.message });
    }
});

export default router;
