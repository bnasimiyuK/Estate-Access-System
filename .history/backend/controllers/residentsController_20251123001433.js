// backend/controllers/residentsController.js
import sql from "mssql";
import { dbPool } from "../server.js";

/* ===========================================================
   DASHBOARD SUMMARY (Admin)
=========================================================== */
export const getDashboardSummary = async (req, res) => {
    try {
        const pool = await dbPool;

        const totalResidentsResult = await pool.request().query("SELECT COUNT(ResidentID) AS residents FROM Residents");
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

        res.status(200).json({
            residents,
            pendingPayments,
            compliance,
        });
    } catch (err) {
        console.error("Dashboard summary error:", err.stack);
        res.status(500).json({ error: "Failed to load dashboard summary", details: err.message });
    }
};

/* ===========================================================
   ACCESS CHART DATA (Admin)
=========================================================== */
export const getAccessChartData = async (req, res) => {
    try {
        const pool = await dbPool;

        const result = await pool.request().query(`
            SELECT FORMAT(TimestampUtc, 'MM/dd') AS DayLabel, COUNT(*) AS AccessCount
            FROM accesslogs
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

/* ===========================================================
   RESIDENT PROFILE
=========================================================== */
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

/* ===========================================================
   GET ALL RESIDENTS (Admin)
=========================================================== */
export const getAllResidents = async (req, res) => {
    try {
        const pool = await dbPool;
        const result = await pool.request().query("SELECT * FROM Residents ORDER BY ResidentName ASC");
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Failed to load residents", details: err.message });
    }
};

/* ===========================================================
   GET APPROVED RESIDENTS
=========================================================== */
export const getApprovedResidents = async (req, res) => {
    try {
        const pool = await dbPool;
        const result = await pool.request()
            .input("StatusActive", sql.NVarChar(50), 'Active')
            .query("SELECT * FROM Residents WHERE Status = @StatusActive ORDER BY ResidentName ASC");
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load approved residents", details: err.message });
    }
};

/* ===========================================================
   VISITOR ACCESS
=========================================================== */
export const getVisitorsAccess = async (req, res) => {
    try {
        const residentId = req.user?.ResidentID;
        if (!residentId) return res.status(400).json({ error: "Resident ID missing in token" });

        const pool = await dbPool;
        const result = await pool.request()
            .input("ResidentID", sql.Int, residentId)
            .query("SELECT TOP 50 * FROM Visitors WHERE ResidentID = @ResidentID ORDER BY VisitDate DESC");

        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("Failed to load visitor access", err);
        res.status(500).json({ error: "Failed to load visitor access", details: err.message });
    }
};

/* ===========================================================
   VISITOR PASSES
=========================================================== */
export const getVisitorPasses = async (req, res) => {
    try {
        const residentID = req.user?.ResidentID;
        if (!residentID) return res.status(401).json({ error: "Unauthorized or missing user context in token." });

        const pool = await dbPool;
        const result = await pool.request()
            .input("ResidentID", sql.Int, residentID)
            .query("SELECT VisitorName, AccessCode, Status FROM VisitorsAccess WHERE ResidentID = @ResidentID ORDER BY CreatedAt DESC");

        res.status(200).json(result.recordset || []);
    } catch (err) {
        console.error("Error retrieving visitor passes:", err);
        res.status(500).json({ error: "Failed to retrieve visitor passes" });
    }
};

/* ===========================================================
   MEMBERSHIP REQUESTS
=========================================================== */
export const getMembershipRequests = async (req, res) => {
    try {
        const residentNationalID = req.user?.NationalID;
        const role = req.user?.role;

        const pool = await dbPool;
        const request = pool.request();
        let query;

        if (role === 'admin') {
            query = "SELECT * FROM MembershipRequests ORDER BY RequestedAt DESC";
        } else if (residentNationalID) {
            request.input("NationalID", sql.VarChar(50), residentNationalID);
            query = "SELECT * FROM MembershipRequests WHERE NationalID = @NationalID ORDER BY RequestedAt DESC";
        } else {
            return res.status(401).json({ error: "Unauthorized or missing user context." });
        }

        const result = await request.query(query);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("Failed to load membership requests:", err);
        res.status(500).json({ error: "Failed to load membership requests", details: err.message });
    }
};

/* ===========================================================
   RESIDENT IDs
=========================================================== */
export const getResidentIDs = async (req, res) => {
    try {
        const pool = await dbPool;
        const result = await pool.request()
            .query("SELECT TOP 100 ResidentID, ResidentName FROM Residents ORDER BY ResidentName");
        res.json(result.recordset);
    } catch (err) {
        console.error("Error fetching resident IDs:", err);
        res.status(500).json({ message: "Failed to fetch resident IDs" });
    }
};

/* ===========================================================
   PAYMENT STATUS
=========================================================== */
export const loadPaymentStatus = async (req, res) => {
    try {
        const phone = req.query.phone;
        if (!phone) return res.status(400).json({ error: "Phone required" });

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

/* ===========================================================
   PAY FOR SERVICE
=========================================================== */
export const payForService = async (req, res) => {
    try {
        const { phone, serviceName, amount } = req.body;
        const residentID = req.user?.ResidentID;
        const nationalID = req.user?.NationalID;

        if (!residentID || !nationalID) return res.status(401).json({ error: "Missing resident data in token" });
        if (!phone || !serviceName || !amount) return res.status(400).json({ error: "phone, serviceName & amount required" });

        const pool = await dbPool;

        // Insert into Payments table
        const paymentResult = await pool.request()
            .input("PhoneNumber", sql.VarChar(20), phone)
            .input("ResidentID", sql.Int, residentID)
            .input("NationalID", sql.VarChar(50), nationalID)
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

        // Insert into PaymentHistory
        await pool.request()
            .input("ResidentID", sql.Int, residentID)
            .input("Amount", sql.Decimal(18, 2), amount)
            .input("NationalID", sql.VarChar(50), nationalID)
            .input("ServiceName", sql.NVarChar(100), serviceName)
            .input("PhoneNumber", sql.VarChar(20), phone)
            .input("VerifiedDate", sql.DateTime, null)
            .input("Reference", sql.VarChar(100), serviceName)
            .input("StatusPending", sql.NVarChar(50), "Pending")
            .query(`
                INSERT INTO PaymentHistory
                (ResidentID, Amount, NationalID, ServiceName, PhoneNumber, VerifiedDate, Status, PaymentDate, Reference)
                VALUES
                (@ResidentID, @Amount, @NationalID, @ServiceName, @PhoneNumber, @VerifiedDate, @StatusPending, GETDATE(), @Reference)
            `);

        res.status(201).json({
            message: "Payment initialized and recorded",
            payment: paymentResult.recordset[0],
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Payment failed", details: err.message });
    }
};

/* ===========================================================
   SYNC RESIDENTS
=========================================================== */
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
