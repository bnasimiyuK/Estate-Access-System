// ==========================================
// controllers/dashboardController.js
// Admin Dashboard: Summaries & Analytics
// ==========================================

import sql from "mssql";
import dotenv from "dotenv";
import { getDashboardSummary, getAccessChartData } from "../controllers/residentsController.js";
import { authenticateJWT, isAdmin } from "../middleware/authMiddleware.js";
dotenv.config();

// ==========================================
// Database Configuration
// ==========================================
const dbConfig = {
    user: process.env.DB_USER || "Beverly",
    password: process.env.DB_PASS || "Bev@1234567",
    server: process.env.DB_SERVER || "localhost",
    database: process.env.DB_NAME || "EstateAccessManagementSystem",
    options: { encrypt: true, trustServerCertificate: true },
};

// ====================================================
// Get dashboard summary stats
// ====================================================
export const getDashboardSummary = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        // Query for totals
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

// ====================================================
// Get monthly access logs for chart
// ====================================================
export const getMonthlyAccessStats = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        // Example: Last 6 months visitor check-ins
        const result = await pool.request().query(`
            SELECT 
                FORMAT(LogTimestamp, 'yyyy-MM') AS Month,
                SUM(CASE WHEN LogType='CheckIn' THEN 1 ELSE 0 END) AS CheckIns,
                SUM(CASE WHEN LogType='CheckOut' THEN 1 ELSE 0 END) AS CheckOuts
            FROM AccessLogs
            WHERE LogTimestamp >= DATEADD(MONTH, -6, GETDATE())
            GROUP BY FORMAT(LogTimestamp, 'yyyy-MM')
            ORDER BY Month ASC
        `);

        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("❌ getMonthlyAccessStats Error:", err);
        res.status(500).json({ success: false, message: "Failed to load monthly access stats" });
    }
};

// ====================================================
// Get recent membership requests
// ====================================================
export const getRecentMembershipRequests = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request().query(`
            SELECT TOP (10) RequestID, ResidentName, RoleName, Status, RequestedAt
            FROM MembershipRequests
            ORDER BY RequestedAt DESC
        `);

        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("❌ getRecentMembershipRequests Error:", err);
        res.status(500).json({ success: false, message: "Failed to load recent membership requests" });
    }
};

// ====================================================
// Get recent visitor logs
// ====================================================
export const getRecentVisitorLogs = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request().query(`
            SELECT TOP (10) VisitorName, LogType, LogTimestamp, HouseNumber, CourtName
            FROM AccessLogs
            ORDER BY LogTimestamp DESC
        `);

        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("❌ getRecentVisitorLogs Error:", err);
        res.status(500).json({ success: false, message: "Failed to load recent visitor logs" });
    }
};

// ====================================================
// Get residents statistics for charts
// ====================================================
export const getResidentsStats = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        // Example: residents per court
        const result = await pool.request().query(`
            SELECT CourtName, COUNT(*) AS ResidentCount
            FROM Residents
            GROUP BY CourtName
            ORDER BY CourtName
        `);

        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("❌ getResidentsStats Error:", err);
        res.status(500).json({ success: false, message: "Failed to load residents stats" });
    }
};

// ====================================================
// Get membership approvals stats
// ====================================================
export const getMembershipStatusStats = async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);

        const result = await pool.request().query(`
            SELECT Status, COUNT(*) AS Total
            FROM MembershipRequests
            GROUP BY Status
        `);

        res.status(200).json({ success: true, data: result.recordset });
    } catch (err) {
        console.error("❌ getMembershipStatusStats Error:", err);
        res.status(500).json({ success: false, message: "Failed to load membership status stats" });
    }
};
router.get("/summary", authenticateJWT, isAdmin, getDashboardSummary);
router.get("/accesschart", authenticateJWT, isAdmin, getAccessChartData);