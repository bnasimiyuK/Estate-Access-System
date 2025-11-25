import sql from "mssql";
import { dbPool } from "../server.js";

/* ===========================================================
   DASHBOARD SUMMARY (Admin)
=========================================================== */
export const getDashboardSummary = async (req, res) => {
    try {
        const pool = await dbPool;

        const totalResidents = await pool.request().query(`
            SELECT COUNT(ResidentID) AS residents FROM Residents
        `);

        const pendingPayments = await pool.request()
            .input("StatusPending", sql.NVarChar(50), "Pending")
            .query(`
                SELECT COUNT(PaymentID) AS pendingPayments 
                FROM Payments 
                WHERE Status = @StatusPending
            `);

        const paidResidents = await pool.request()
            .input("StatusVerified", sql.NVarChar(50), "Verified")
            .query(`
                SELECT COUNT(DISTINCT ResidentID) AS paidResidents 
                FROM Payments 
                WHERE Status = @StatusVerified
            `);

        const residents = totalResidents.recordset[0].residents || 0;
        const pending = pendingPayments.recordset[0].pendingPayments || 0;
        const paid = paidResidents.recordset[0].paidResidents || 0;

        const compliance =
            residents > 0 ? Math.round((paid / residents) * 100) : 0;

        res.json({
            residents,
            pendingPayments: pending,
            paidResidents: paid,
            compliance,
        });

    } catch (err) {
        console.error("Dashboard summary error:", err);
        res.status(500).json({ error: "Failed to load dashboard summary" });
    }
};

/* ===========================================================
   ACCESS CHART DATA (Admin)
=========================================================== */
export const getAccessChartData = async (req, res) => {
    try {
        const pool = await dbPool;

        const result = await pool.request().query(`
            SELECT FORMAT(TimestampUtc, 'MM/dd') AS DayLabel,
                   COUNT(*) AS AccessCount
            FROM accesslogs
            WHERE TimestampUtc >= DATEADD(day, -14, GETDATE())
            GROUP BY FORMAT(TimestampUtc, 'MM/dd')
            ORDER BY MIN(TimestampUtc)
        `);

        res.json({
            days: result.recordset.map(r => r.DayLabel),
            counts: result.recordset.map(r => r.AccessCount),
        });

    } catch (err) {
        console.error("Access chart error:", err);
        res.status(500).json({ error: "Failed to load chart" });
    }
};

/* ===========================================================
   RESIDENT PROFILE
=========================================================== */
export const getResidentProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const pool = await dbPool;
        const result = await pool.request()
            .input("UserID", sql.Int, userId)
            .query(`
                SELECT 
                    ResidentID,
                    UserID,
                    NationalID,
                    HouseNumber,
                    Occupation,
                    DateJoined,
                    Status,
                    ResidentName,
                    PhoneNumber,
                    Email,
                    CourtName,
                    RoleName,
                    TotalDue
                FROM Residents
                WHERE UserID = @UserID
            `);

        if (result.recordset.length === 0)
            return res.status(404).json({ message: "Resident not found" });

        res.json(result.recordset[0]);

    } catch (err) {
        console.error("Profile error:", err);
        res.status(500).json({ message: "Error loading resident profile" });
    }
};

/* ===========================================================
   ALL RESIDENTS (Admin)
=========================================================== */
export const getAllResidents = async (req, res) => {
    try {
        const pool = await dbPool;
        const result = await pool.request().query(`
            SELECT 
                ResidentID,
                UserID,
                NationalID,
                HouseNumber,
                Occupation,
                DateJoined,
                Status,
                ResidentName,
                PhoneNumber,
                Email,
                CourtName,
                RoleName,
                TotalDue
            FROM Residents
            ORDER BY ResidentID DESC
        `);

        res.json(result.recordset);

    } catch (err) {
        console.error("Error fetching residents:", err);
        res.status(500).json({ error: "Error loading residents" });
    }
};

/* ===========================================================
   APPROVED RESIDENTS
=========================================================== */
export const getApprovedResidents = async (req, res) => {
    try {
        const pool = await dbPool;
        const result = await pool.request()
            .input("StatusActive", sql.NVarChar(50), "Active")
            .query(`
                SELECT * 
                FROM Residents 
                WHERE Status = @StatusActive 
                ORDER BY ResidentName ASC
            `);

        res.json(result.recordset);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load approved residents" });
    }
};

/* ===========================================================
   VISITOR ACCESS
=========================================================== */
export const getVisitorsAccess = async (req, res) => {
    try {
        const residentId = req.user.ResidentID;

        if (!residentId)
            return res.status(400).json({ error: "Resident ID missing" });

        const pool = await dbPool;
        const result = await pool.request()
            .input("ResidentID", sql.Int, residentId)
            .query(`
                SELECT TOP 50 *
                FROM Visitors
                WHERE ResidentID = @ResidentID
                ORDER BY VisitDate DESC
            `);

        res.json(result.recordset);

    } catch (err) {
        console.error("Visitor access error:", err);
        res.status(500).json({ error: "Failed to load visitor access" });
    }
};

/* ===========================================================
   VISITOR PASSES
=========================================================== */
export const getVisitorPasses = async (req, res) => {
    try {
        const residentID = req.user.ResidentID;

        const pool = await dbPool;
        const result = await pool.request()
            .input("ResidentID", sql.Int, residentID)
            .query(`
                SELECT VisitorName, AccessCode, Status
                FROM VisitorsAccess
                WHERE ResidentID = @ResidentID
                ORDER BY CreatedAt DESC
            `);

        res.json(result.recordset);

    } catch (err) {
        console.error("Visitor passes error:", err);
        res.status(500).json({ error: "Failed to retrieve visitor passes" });
    }
};

/* ===========================================================
   MEMBERSHIP REQUESTS
=========================================================== */
export const getMembershipRequests = async (req, res) => {
    try {
        const role = req.user.role;
        const nationalID = req.user.NationalID;

        const pool = await dbPool;
        const request = pool.request();
        let query;

        if (role === "admin") {
            query = "SELECT * FROM MembershipRequests ORDER BY RequestedAt DESC";
        } else {
            request.input("NationalID", sql.VarChar(50), nationalID);
            query = `
                SELECT * 
                FROM MembershipRequests 
                WHERE NationalID = @NationalID 
                ORDER BY RequestedAt DESC
            `;
        }

        const result = await request.query(query);
        res.json(result.recordset);

    } catch (err) {
        console.error("Membership error:", err);
        res.status(500).json({ error: "Failed to load membership requests" });
    }
};

/* ===========================================================
   RESIDENT ID LIST
=========================================================== */
export const getResidentIDs = async (req, res) => {
    try {
        const pool = await dbPool;
        const result = await pool.request().query(`
            SELECT TOP 100 ResidentID, ResidentName 
            FROM Residents 
            ORDER BY ResidentName
        `);

        res.json(result.recordset);

    } catch (err) {
        console.error("ID error:", err);
        res.status(500).json({ message: "Failed to fetch resident IDs" });
    }
};
export const loadPaymentStatus = async (req, res) => {
    try {
        const phone = req.query.phone;
        if (!phone) return res.status(400).json({ error: "Phone required" });

        const pool = await dbPool;
        const result = await pool.request()
            .input("PhoneNumber", sql.VarChar(20), phone)
            .query("SELECT TOP 1 * FROM Payments WHERE PhoneNumber = @PhoneNumber ORDER BY PaymentID DESC");

        if (!result.recordset.length) return res.status(200).json({
            isPaid: false,
            status: "No Record Found",
            phone
        });

        const p = result.recordset[0];
        const isPaid = ["paid", "verified"].includes(p.Status?.toLowerCase());

        res.status(200).json({
            phone: p.PhoneNumber,
            status: p.Status,
            amount: p.Amount,
            paymentDate: p.PaymentDate,
            isPaid
        });

    } catch (err) {
        console.error("loadPaymentStatus error:", err);
        res.status(500).json({ error: "Failed to fetch payment status", details: err.message });
    }
};
export const payForService = async (req, res) => {
    try {
        const { phone, serviceName, amount } = req.body;
        const residentID = req.user?.ResidentID;
        const nationalID = req.user?.NationalID;

        if (!residentID || !nationalID) {
            return res.status(401).json({ error: "Missing resident data in token" });
        }
        if (!phone || !serviceName || !amount) {
            return res.status(400).json({ error: "phone, serviceName & amount required" });
        }

        const pool = await dbPool;

        // Insert into Payments table
        const paymentResult = await pool.request()
            .input("PhoneNumber", sql.VarChar(20), phone)
            .input("ResidentID", sql.Int, residentID)
            .input("NationalID", sql.VarChar(50), nationalID)
            .input("ServiceName", sql.NVarChar(100), serviceName)
            .input("Amount", sql.Decimal(18,2), amount)
            .input("PaymentMethod", sql.NVarChar(50), "M-Pesa")
            .input("StatusPending", sql.NVarChar(50), "Pending")
            .query(`
                INSERT INTO Payments 
                (PhoneNumber, NationalID, ResidentID, ServiceName, Amount, PaymentMethod, Status, PaymentDate)
                OUTPUT INSERTED.*
                VALUES 
                (@PhoneNumber, @NationalID, @ResidentID, @ServiceName, @Amount, @PaymentMethod, @StatusPending, GETDATE())
            `);

        // Insert into PaymentHistory table
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
            message: "Payment initialized successfully",
            payment: paymentResult.recordset[0]
        });

    } catch (err) {
        console.error("payForService error:", err);
        res.status(500).json({ error: "Payment failed", details: err.message });
    }
};
