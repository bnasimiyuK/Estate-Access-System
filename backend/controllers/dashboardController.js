// dashboardController.js
import sql from "mssql";
import dotenv from "dotenv";
dotenv.config();

const dbConfig = {
    user: process.env.DB_USER || "Beverly",
    password: process.env.DB_PASS || "Bev@1234567",
    server: process.env.DB_SERVER || "localhost",
    database: process.env.DB_NAME || "EstateAccessManagementSystem",
    options: { encrypt: true, trustServerCertificate: true },
};

// Dashboard summary
export const getDashboardSummary = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT
                (SELECT COUNT(*) FROM Residents) AS totalResidents,
                (SELECT COUNT(*) FROM Visitors) AS totalVisitors,
                (SELECT COUNT(*) FROM MembershipRequests WHERE Status = 'Pending') AS pendingMemberships,
                (SELECT COUNT(*) FROM MembershipRecords) AS totalMemberships,
                (SELECT COUNT(*) FROM AccessLogs WHERE LogType='CheckIn' AND CAST(LogTimestamp AS DATE) = CAST(GETDATE() AS DATE)) AS visitorsCheckedInToday,
                (SELECT COUNT(*) FROM AccessLogs WHERE LogType='CheckOut' AND CAST(LogTimestamp AS DATE) = CAST(GETDATE() AS DATE)) AS visitorsCheckedOutToday
        `);
        res.status(200).json({ success: true, data: result.recordset[0] });
    } catch (err) {
        console.error("❌ getDashboardSummary Error:", err);
        res.status(500).json({ success: false, message: "Failed to load dashboard summary" });
    }
};

// Access chart data
export const getAccessChartData = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query(`
            SELECT TOP 7 CAST(LogTimestamp AS DATE) AS Date, COUNT(*) AS TotalPasses
            FROM AccessLogs
            GROUP BY CAST(LogTimestamp AS DATE)
            ORDER BY Date DESC
        `);
        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("❌ getAccessChartData Error:", err);
        res.status(500).json({ success: false, message: "Failed to load access chart data" });
    }
};
