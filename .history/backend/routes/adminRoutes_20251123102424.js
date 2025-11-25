import { Router } from 'express';
import sql from 'mssql';
import { dbPool } from '../server.js'; // Import the established pool connection
import { authenticateJWT } from '../middleware/authMiddleware.js'; // Assuming you have an auth middleware
import { getAccessChart } from '../controllers/adminController.js';

const router = Router();

// Apply token verification to all admin routes
router.use(authenticateJWT);

// ---
/**
 * @route GET /api/admin/summary
 * @description Fetches the main dashboard summary counts.
 * FIX: Used dbo.accesslogs and dbo.Residents to resolve "Invalid object name" errors.
 */
router.get('/summary', async (req, res) => {
    try {
        const pool = await dbPool;

        // 1. Total Residents
        // FIX: Corrected SQL syntax by comparing Status to the integer 1 (for active)
        const residentsResult = await pool.request()
            .query("SELECT COUNT(*) AS total FROM dbo.Residents WHERE Status = 'Active'");
        const totalResidents = residentsResult.recordset[0].total;

        // 2. Pending Payments (Assuming Status column exists in dbo.Payments)
        const paymentsResult = await pool.request()
            .query("SELECT COUNT(*) AS pending FROM dbo.Payments WHERE Status = 'pending'");
        const pendingPayments = paymentsResult.recordset[0].pending;

        // 3. Gate Overrides Today (Assuming Overrides are logged in dbo.accesslogs with Type='Override')
        const overridesResult = await pool.request()
            .query(`
                SELECT COUNT(*) AS overrides
                FROM dbo.accesslogs
                WHERE LogType = 'Override' 
                AND TimestampUtc >= CAST(GETDATE() AS DATE)
            `);
        const overrideCount = overridesResult.recordset[0].overrides;

        // 4. Compliance Percentage (Simple calculation: (Total Residents - Pending Payments) / Total Residents * 100)
        let compliancePct = 0;
        if (totalResidents > 0) {
            compliancePct = Math.round(((totalResidents - pendingPayments) / totalResidents) * 100);
        }

        res.json({
            residents: totalResidents,
            pendingPayments: pendingPayments,
            compliance: compliancePct,
            overrides: overrideCount
        });

    } catch (error) {
        // Log the detailed error on the server
        console.error("Summary API Error (500):", error.message || error);
        res.status(500).json({ message: "Server error" });
    }
});

// ---

/**
 * @route GET /api/admin/accesschart
 * @description Fetches 14 days of access attempt data for the chart.
 * FIX: Used dbo.accesslogs to resolve "Invalid object name" errors.
 */
router.get('/accesschart', async (req, res) => {
    try {
        const pool = await dbPool;

        // SQL query to count access attempts (including successful and denied) by date for the last 14 days
        const chartResult = await pool.request().query(`
            SELECT
                CAST(TimestampUtc AS DATE) AS LogDate,
                COUNT(*) AS AccessCount
            FROM dbo.accesslogs
            WHERE TimestampUtc >= DATEADD(day, -14, GETDATE())
            GROUP BY CAST(TimestampUtc AS DATE)
            ORDER BY LogDate;
        `);

        // Prepare data for Chart.js (filling in zero for days with no logs)
        const days = [];
        const counts = [];
        const dataMap = new Map();

        // Map results for quick lookup
        chartResult.recordset.forEach(row => {
            // ISO Date format: YYYY-MM-DD
            dataMap.set(row.LogDate.toISOString().substring(0, 10), row.AccessCount);
        });

        // Generate the last 14 days and populate counts
        for (let i = 13; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().substring(0, 10);
            
            days.push(dateString);
            counts.push(dataMap.get(dateString) || 0);
        }

        res.json({ days, counts });

    } catch (error) {
        // Log the detailed error on the server
        console.error("Access Chart API Error (500):", error.message || error);
        res.status(500).json({ message: "Server error" });
    }
});
outer.get('/admin/accesschart', getAccessChart);
export default router;