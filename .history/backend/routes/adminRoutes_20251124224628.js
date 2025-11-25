import { Router } from 'express';
import { dbPool } from '../server.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';

const router = Router();

// Apply JWT to all admin routes
router.use(authenticateJWT);

// ==============================
// DASHBOARD SUMMARY
// ==============================
router.get('/summary', async (req, res) => {
    try {
        const pool = await dbPool;

        const totalResidentsResult = await pool.request()
            .query("SELECT COUNT(*) AS total FROM dbo.Residents WHERE Status = 'Active'");
        const totalResidents = totalResidentsResult.recordset[0].total;

        const pendingPaymentsResult = await pool.request()
            .query("SELECT COUNT(*) AS pending FROM dbo.Payments WHERE Status = 'pending'");
        const pendingPayments = pendingPaymentsResult.recordset[0].pending;

        const overridesResult = await pool.request()
            .query(`
                SELECT COUNT(*) AS overrides
                FROM dbo.accesslogs
                WHERE LogType = 'Override'
                AND TimestampUtc >= CAST(GETDATE() AS DATE)
            `);
        const overrideCount = overridesResult.recordset[0].overrides;

        const compliancePct = totalResidents > 0
            ? Math.round(((totalResidents - pendingPayments) / totalResidents) * 100)
            : 0;

        res.json({
            residents: totalResidents,
            pendingPayments,
            compliance: compliancePct,
            overrides: overrideCount
        });
    } catch (err) {
        console.error("Summary API Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});

// ==============================
// ACCESS CHART (last 14 days)
// ==============================
router.get('/accesschart', async (req, res) => {
    try {
        const pool = await dbPool;
        const result = await pool.request().query(`
            SELECT CAST(TimestampUtc AS DATE) AS LogDate, COUNT(*) AS AccessCount
            FROM dbo.accesslogs
            WHERE TimestampUtc >= DATEADD(day, -14, GETDATE())
            GROUP BY CAST(TimestampUtc AS DATE)
            ORDER BY LogDate
        `);

        const dataMap = new Map();
        result.recordset.forEach(row => {
            dataMap.set(row.LogDate.toISOString().substring(0, 10), row.AccessCount);
        });

        const days = [];
        const counts = [];
        for (let i = 13; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().substring(0, 10);

            days.push(dateString);
            counts.push(dataMap.get(dateString) || 0);
        }

        res.json({ days, counts });
    } catch (err) {
        console.error("Access Chart API Error:", err);
        res.status(500).json({ message: "Server error" });
    }
});


export default router;
