// backend/routes/gateOverridesRoutes.js
import { Router } from "express";
import { dbPool } from "../server.js";
import sql from "mssql";
import { authenticateJWT, isAdmin } from "../middleware/authMiddleware.js";

const router = Router();

// GET /api/gate-overrides?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/", authenticateJWT, isAdmin, async (req, res) => {
    try {
        const { from, to } = req.query;

        let query = `
            SELECT TOP (1000)
                [id],
                [gateId],
                [action],
                [reason],
                [userId],
                [createdAt]
            FROM [EstateAccessManagementSystem].[dbo].[gate_overrides]
        `;

        if (from && to) {
            query += " WHERE CAST(createdAt AS DATE) BETWEEN @from AND @to";
        }

        query += " ORDER BY createdAt DESC";

        const request = dbPool.request();
        if (from && to) {
            request.input("from", sql.Date, from);
            request.input("to", sql.Date, to);
        }

        const result = await request.query(query);
        res.json(result.recordset);

    } catch (err) {
        console.error("Gate overrides fetch error:", err);
        res.status(500).json({ message: "Failed to fetch gate overrides", details: err.message });
    }
});

export default router;
