// residentsController.js

// ============================================================
// IMPORTS
// ============================================================
import sql from "mssql";
import { dbPool } from "../server.js";

// ============================================================
// DASHBOARD SUMMARY (ADMIN)
// ============================================================
export const getDashboardSummary = async (req, res) => {
    const ACCESS_LOGS_TABLE = "[EstateAccessManagementSystem].[dbo].[accesslogs]";
    const OVERRIDES_TABLE = "[EstateAccessManagementSystem].[dbo].[gate_overrides]";

    try {
        const pool = await dbPool;

        const totalResidentsResult = await pool.request().query(
            "SELECT COUNT(ResidentID) AS residents FROM Residents"
        );
        const residents = totalResidentsResult.recordset[0]?.residents || 0;

        const pendingPaymentsResult = await pool
            .request()
            .input("StatusPending", sql.NVarChar(50), 'Pending')
            .query("SELECT COUNT(PaymentID) AS pendingPayments FROM Payments WHERE Status = @StatusPending");
        const pendingPayments = pendingPaymentsResult.recordset[0]?.pendingPayments || 0;

        const paidResidentsCountResult = await pool
            .request()
            .input("StatusVerified", sql.NVarChar(50), 'Verified')
            .query("SELECT COUNT(DISTINCT ResidentID) AS paidResidents FROM Payments WHERE Status = @StatusVerified");
        const paidResidents = paidResidentsCountResult.recordset[0]?.paidResidents || 0;

        const compliance = residents > 0 ? Math.round((parseFloat(paidResidents) / residents) * 100) : 0;

        const overrideMetricsResult = await pool.request().query(`
            SELECT COUNT(id) AS overrideCount
            FROM ${OVERRIDES_TABLE}
            WHERE CAST(createdAt AS DATE) = CAST(GETDATE() AS DATE);
        `);
        const overrideCount = overrideMetricsResult.recordset[0]?.overrideCount || 0;

        const accessMetricsResult = await pool.request().query(`
            SELECT 
                SUM(CASE WHEN [Action] = 'CheckIn' THEN 1 ELSE 0 END) AS visitorscheckedin,
                SUM(CASE WHEN [Action] = 'CheckOut' THEN 1 ELSE 0 END) AS visitorscheckedout,
                SUM(CASE WHEN [Action] = 'Access Denied' THEN 1 ELSE 0 END) AS rejects 
            FROM ${ACCESS_LOGS_TABLE}
            WHERE CAST(TimestampUtc AS DATE) = CAST(GETDATE() AS DATE);
        `);
        const accessData = accessMetricsResult.recordset[0] || {
            visitorscheckedin: 0,
            visitorscheckedout: 0,
            rejects: 0,
        };

        res.status(200).json({
            residents,
            pendingPayments,
            compliance,
            overrideCount,
            visitorscheckedin: accessData.visitorscheckedin,
            visitorscheckedout: accessData.visitorscheckedout,
            rejects: accessData.rejects,
        });

    } catch (err) {
        console.error("Dashboard summary error:", err.stack);
        res.status(500).json({ error: "Failed to load dashboard summary", details: err.message });
    }
};

// ============================================================
// ACCESS CHART (ADMIN)
// ============================================================
export const getAccessChartData = async (req, res) => {
    const ACCESS_LOGS_TABLE = "[EstateAccessManagementSystem].[dbo].[accesslogs]";

    try {
        const pool = await dbPool;

        const result = await pool.request().query(`
            SELECT 
                FORMAT(TimestampUtc, 'MM/dd') AS DayLabel,
                COUNT(*) AS AccessCount
            FROM ${ACCESS_LOGS_TABLE}
            WHERE TimestampUtc >= DATEADD(day, -14, GETDATE())
            GROUP BY FORMAT(TimestampUtc, 'MM/dd')
            ORDER BY MIN(TimestampUtc) ASC;
        `);

        res.status(200).json({
            days: result.recordset.map(r => r.DayLabel),
            counts: result.recordset.map(r => r.AccessCount),
        });
    } catch (err) {
        console.error("Access chart error:", err.stack);
        res.status(500).json({ error: "Failed to load chart", details: err.message });
    }
};

// ============================================================
// RESIDENT PROFILE
// ============================================================
export const getResidentProfile = async (req, res) => {
    try {
        const residentId = req.user?.ResidentID;
        if (!residentId) return res.status(400).json({ error: "Resident ID missing in token" });

        const pool = await dbPool;

        const result = await pool.request()
            .input("ResidentID", sql.Int, residentId)
            .query("SELECT * FROM Residents WHERE ResidentID = @ResidentID");

        if (!result.recordset.length) return res.status(404).json({ error: "Resident not found" });

        res.status(200).json(result.recordset[0]);
    } catch (err) {
        console.error("Resident profile error:", err);
        res.status(500).json({ error: "Failed to load profile", details: err.message });
    }
};

// ============================================================
// ALL RESIDENTS (ADMIN)
// ============================================================
export const getAllResidents = async (req, res) => {
    try {
        const pool = await dbPool;
        const result = await pool.request().query("SELECT * FROM Residents ORDER BY ResidentName ASC");
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Failed to load residents", details: err.message });
    }
};

// ============================================================
// VISITOR ACCESS
// ============================================================
export const getVisitorsAccess = async (req, res) => {
    try {
        const residentId = req.user?.ResidentID;
        if (!residentId) return res.status(400).json({ error: "Resident ID missing in token" });

        const pool = await dbPool;
        const result = await pool.request()
            .input("ResidentID", sql.Int, residentId)
            .query("SELECT TOP 50 * FROM Visitors WHERE ResidentID = @ResidentID ORDER BY VisitDate DESC");

        res.status(200).json({ visitors: result.recordset });
    } catch (err) {
        console.error("Failed to load visitor access", err);
        res.status(500).json({ error: "Failed to load visitor access", details: err.message });
    }
};

// ============================================================
// VISITOR PASSES
// ============================================================
export const getVisitorPasses = async (req, res) => {
    const residentID = req.user?.ResidentID;
    if (!residentID) return res.status(401).json({ error: "Unauthorized or missing user context." });

    try {
        const pool = await dbPool;
        const result = await pool.request()
            .input('ResidentID', sql.Int, residentID)
            .query(`
                SELECT VisitorName, AccessCode, Status 
                FROM VisitorsAccess
                WHERE ResidentID = @ResidentID
                ORDER BY CreatedAt DESC
            `);

        res.status(200).json(result.recordset || []);
    } catch (err) {
        console.error("Error retrieving visitor passes:", err);
        res.status(500).json({ error: "Failed to retrieve visitor passes" });
    }
};

// ============================================================
// MEMBERSHIP REQUESTS
// ============================================================
export const getMembershipRequests = async (req, res) => {
    const residentNationalID = req.user?.NationalID;
    if (!residentNationalID) return res.status(401).json({ error: "National ID missing in token" });

    try {
        const pool = await dbPool;
        const result = await pool.request()
            .input("NationalID", sql.VarChar(50), residentNationalID)
            .query("SELECT RequestID, ResidentName, Status, RequestedAt FROM MembershipRequests WHERE NationalID = @NationalID ORDER BY RequestedAt DESC");

        res.status(200).json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load membership requests", details: err.message });
    }
};

// ============================================================
// APPROVED RESIDENTS
// ============================================================
export const getApprovedResidents = async (req, res) => {
    try {
        const pool = await dbPool;
        const result = await pool.request()
            .input("StatusApproved", sql.NVarChar(50), 'Approved')
            .query("SELECT * FROM Residents WHERE Status = @StatusApproved ORDER BY ResidentName ASC");
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load approved residents", details: err.message });
    }
};

// ============================================================
// PAYMENT STATUS
// ============================================================
export const getPaymentStatusController = async (req, res) => {
    const phone = req.query.phone;
    if (!phone) return res.status(400).json({ error: "Phone required" });

    try {
        const pool = await dbPool;
        const result = await pool.request()
            .input("PhoneNumber", sql.VarChar(20), phone)
            .query("SELECT TOP 1 * FROM Payments WHERE PhoneNumber = @PhoneNumber ORDER BY PaymentID DESC");

        if (!result.recordset.length) return res.status(200).json({ isPaid: false, status: "No Record Found", phone });

        const p = result.recordset[0];
        const isPaid = ["paid", "verified"].includes(p.Status?.toLowerCase());

        res.status(200).json({
            phone: p.PhoneNumber,
            status: p.Status,
            amount: p.Amount,
            paymentDate: p.PaymentDate,
            isPaid,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch payment status", details: err.message });
    }
};

// Alias for backward compatibility
export const loadPaymentStatus = getPaymentStatusController;

// ============================================================
// PAY FOR SERVICE
// ============================================================
// ------------------------------------------------------------------
// PAY FOR SERVICE (records in Payments + PaymentHistory)
// ------------------------------------------------------------------
export const payForService = async (req, res) => {
    try {
        const { phone, serviceName, amount } = req.body;
        const nationalID = req.user.NationalID;
        const residentID = req.user.ResidentID;

        if (!nationalID || !residentID)
            return res.status(401).json({ error: "Missing resident data in token" });

        if (!phone || !serviceName || !amount)
            return res.status(400).json({ error: "phone, serviceName & amount required" });

        const pool = await dbPool;

        // 1️⃣ Insert into Payments
        const result = await pool.request()
            .input("PhoneNumber", sql.VarChar(20), phone)
            .input("NationalID", sql.VarChar(50), nationalID)
            .input("ResidentID", sql.Int, residentID)
            .input("ServiceName", sql.NVarChar(100), serviceName)
            .input("Amount", sql.Decimal(18, 2), amount)
            .input("PaymentMethod", sql.NVarChar(50), "M-Pesa")
            .input("StatusPending", sql.NVarChar(50), "Pending")
            .query(`
                INSERT INTO Payments
                    (PhoneNumber, NationalID, ResidentID, ServiceName, Amount, PaymentMethod, Status, PaymentDate)
                OUTPUT INSERTED.*
                VALUES
                    (@PhoneNumber, @NationalID, @ResidentID, @ServiceName, @Amount, @PaymentMethod, @StatusPending, GETDATE())
            `);

        // 2️⃣ Insert into PaymentHistory
        // 2️⃣ Insert into PaymentHistory with additional columns
await pool.request()
    .input("ResidentID", sql.Int, residentID)
    .input("Amount", sql.Decimal(18, 2), amount)
    .input("NationalID", sql.VarChar(50), nationalID)
    .input("ServiceName", sql.NVarChar(100), serviceName || null)
    .input("PhoneNumber", sql.VarChar(20), phone)
    .input("VerifiedDate", sql.DateTime, null) // initially null
    .input("Reference", sql.VarChar(100), serviceName || null)
    .input("StatusPending", sql.NVarChar(50), 'Pending')
    .query(`
        INSERT INTO PaymentHistory 
        (ResidentID, Amount, NationalID, ServiceName, PhoneNumber, VerifiedDate, Status, PaymentDate, Reference)
        VALUES 
        (@ResidentID, @Amount, @NationalID, @ServiceName, @PhoneNumber, @VerifiedDate, @StatusPending, GETDATE(), @Reference)
    `);


        res.status(201).json({
            message: "Payment initialized and history recorded",
            payment: result.recordset[0],
        });

    } catch (err) {
        res.status(500).json({
            error: "Payment failed",
            details: err.message,
        });
    }
};


// ============================================================
// SYNC RESIDENTS
// ============================================================
export const syncResidents = async (req, res) => {
    try {
        const pool = await dbPool;
        const tx = new sql.Transaction(pool);
        await tx.begin();

        try {
            const pendingRequestsResult = await tx.request()
                .input("StatusApproved", sql.NVarChar(50), 'Approved')
                .query("SELECT * FROM MembershipRequests WHERE Status = @StatusApproved AND RecordID IS NULL");

            const pending = pendingRequestsResult.recordset;
            if (!pending.length) {
                await tx.commit();
                return res.status(200).json({ message: "No new residents to sync." });
            }

            let synced = 0;
            for (const r of pending) {
                const insertResult = await tx.request()
                    .input("ResidentName", sql.NVarChar, r.ResidentName)
                    .input("NationalID", sql.NVarChar, r.NationalID)
                    .input("PhoneNumber", sql.NVarChar, r.PhoneNumber)
                    .input("Email", sql.NVarChar, r.Email)
                    .input("HouseNumber", sql.NVarChar, r.HouseNumber)
                    .input("CourtName", sql.NVarChar, r.CourtName)
                    .input("RoleName", sql.NVarChar, r.RoleName)
                    .input("DateJoined", sql.DateTime, new Date())
                    .input("StatusActive", sql.NVarChar, 'Active')
                    .query(`
                        INSERT INTO Residents
                        (ResidentName, NationalID, PhoneNumber, Email, HouseNumber, CourtName, RoleName, DateJoined, Status)
                        OUTPUT INSERTED.ResidentID
                        VALUES (@ResidentName, @NationalID, @PhoneNumber, @Email, @HouseNumber, @CourtName, @RoleName, @DateJoined, @StatusActive)
                    `);

                const newResidentID = insertResult.recordset[0].ResidentID;

                await tx.request()
                    .input("RecordID", sql.Int, newResidentID)
                    .input("RequestID", sql.Int, r.RequestID)
                    .input("StatusSynced", sql.NVarChar, 'Synced')
                    .query("UPDATE MembershipRequests SET RecordID = @RecordID, Status = @StatusSynced WHERE RequestID = @RequestID");

                synced++;
            }

            await tx.commit();
            res.status(200).json({ message: `Successfully synced ${synced} resident(s).` });

        } catch (err) {
            await tx.rollback();
            throw err;
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to sync residents", details: err.message });
    }
};
export const payController = payForService;
