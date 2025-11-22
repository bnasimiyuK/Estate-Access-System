// =====================================
// LOAD ENVIRONMENT VARIABLES
// =====================================
import dotenv from "dotenv";
dotenv.config();

// =====================================
// IMPORTS
// =====================================
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import sql from "mssql"; // Used for dbPool definition and M-Pesa callback logic
import axios from "axios"; // Used for M-Pesa token

// Import routes
import authRoutes from "./routes/authRoutes.js";
import residentsRoutes from "./routes/residentsRoutes.js";
import membershipRoutes from "./routes/membershipRoutes.js";
import paymentsRoutes from "./routes/paymentRoutes.js";
import dashboardRouter from "./routes/dashboard.js";

// Middleware
import { authenticateJWT } from "./middleware/authMiddleware.js";

// Controllers (for optional direct bindings)
import { 
    getMembershipRequests, 
    getApprovedResidents, 
    getVisitorPasses,
    payController,
    getPaymentStatusController,
} from "./controllers/residentsController.js";

// =====================================
// EXPRESS APP SETUP
// =====================================
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================
// 1. MSSQL CONFIG (From first code block)
// =====================================
const dbConfig = {
    user: process.env.DB_USER || "Beverly",
    password: process.env.DB_PASSWORD || "Bev@1234567",
    server: process.env.DB_SERVER || "localhost",
    database: process.env.DB_NAME || "EstateAccessManagementSystem",
    port: parseInt(process.env.DB_PORT) || 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

// =====================================
// 2. GLOBAL CONNECTION POOL (PROMISE) (From first code block)
// NOTE: Replaced the import from config/dbPool.js with the actual definition.
// =====================================
export const dbPool = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log("✅ Connected to MSSQL");
        return pool;
    })
    .catch(err => {
        console.error("❌ MSSQL Connection Error:", err);
        process.exit(1);
    });

// =====================================
// 3. MPESA CONFIG (From first code block)
// =====================================
export const SHORTCODE = process.env.MPESA_SHORTCODE || "174379";
export const PASSKEY = process.env.MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
export const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || "kmOLZ06AIGR4EtIovle2fwsLQU51YbWjdnSG516peEqwADAG";
export const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || "i3JqaV9P75jf5Uz60jhG2R4Ph4Ix9DJs2DbM8UvfCHIjfu2BOmO5i1UTjDeAc2Aj";
export const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || "https://yessenia-anthropocentric-nonpersonally.ngrok-free.dev/api/residents/payment-callback";

// =====================================
// 4. GET MPESA TOKEN (From first code block)
// =====================================
export async function getAccessToken() {
    try {
        const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
        const { data } = await axios.get(
            "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            { headers: { Authorization: `Basic ${auth}` } }
        );
        return data.access_token;
    } catch (err) {
        console.error("MPESA token error:", err.response?.data || err.message);
        throw new Error("Failed to get MPESA token");
    }
}

// =====================================
// MIDDLEWARE (From second code block)
// =====================================
const corsOptions = {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'] 
};

app.use(cors(corsOptions)); 
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Added from the second block for safety
app.use(express.static(path.join(__dirname, "frontend")));

// =====================================
// ROUTES (From second code block)
// =====================================
app.use("/api/auth", authRoutes);
app.use("/api/residents", residentsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/membership", membershipRoutes);

// DIRECT ROUTE BINDINGS (From second code block)
app.get("/api/residents/membership", authenticateJWT, getMembershipRequests);
app.get("/api/residents/approved", authenticateJWT, getApprovedResidents);
app.get("/api/residents/visitorsaccess", authenticateJWT, getVisitorPasses);
app.post("/api/residents/pay", authenticateJWT, payController);
app.get("/api/residents/payment-status", authenticateJWT, getPaymentStatusController);

// DASHBOARD ROUTES (From second code block)
app.get("/api/dashboard/summary", authenticateJWT, async (req, res) => {
    try {
        const pool = await dbPool;
        const summaryResult = await pool.request().query(`
            SELECT
                (SELECT COUNT(*) FROM Residents WHERE Status = 'Approved') as ApprovedResidents,
                (SELECT COUNT(*) FROM MembershipRequests WHERE Status = 'Pending') as PendingRequests,
                (SELECT COUNT(*) FROM VisitorPasses WHERE IssuedAt > DATEADD(day, -7, GETDATE())) as WeeklyVisitors;
        `);
        res.status(200).json(summaryResult.recordset[0] || {});
    } catch (err) {
        console.error("Error fetching dashboard summary:", err);
        res.status(500).json({ message: "Failed to fetch dashboard summary." });
    }
});

app.get("/api/membership/records", authenticateJWT, getApprovedResidents); 

app.get("/api/access/chart", authenticateJWT, async (req, res) => {
    try {
        const pool = await dbPool;
        const chartDataResult = await pool.request().query(`
            SELECT TOP 7 
                CAST(IssuedAt AS DATE) as Date, 
                COUNT(*) as TotalPasses 
            FROM VisitorPasses 
            GROUP BY CAST(IssuedAt AS DATE)
            ORDER BY Date DESC;
        `);
        res.status(200).json(chartDataResult.recordset);
    } catch (err) {
        console.error("Error fetching chart data:", err);
        res.status(500).json({ message: "Failed to fetch chart data." });
    }
});

app.get("/api/membership/requests", authenticateJWT, getMembershipRequests);
app.get('/api/admin/membership', authenticateJWT, getMembershipRequests); 


// =====================================
// 5. MPESA CALLBACK ROUTE (From first code block)
// =====================================
app.post("/api/residents/payment-callback", async (req, res) => {
    try {
        const callbackData = req.body.Body?.stkCallback;
        if (!callbackData) {
            console.warn("Received invalid M-Pesa callback body:", req.body);
            return res.status(400).send("Invalid callback data structure");
        }

        const resultCode = callbackData.ResultCode;
        const checkoutRequestID = callbackData.CheckoutRequestID;
        const metadata = callbackData.CallbackMetadata?.Item;
        
        let mpesaReceiptNumber = null;
        let phoneNumber = null;

        if (resultCode === 0 && metadata) {
            mpesaReceiptNumber = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            phoneNumber = metadata.find(item => item.Name === 'PhoneNumber')?.Value;
        }

        const status = resultCode === 0 ? "Verified" : "Failed";

        if (checkoutRequestID) {
            const pool = await dbPool;
            
            await pool.request()
                .input("PhoneNumber", sql.VarChar(20), phoneNumber || '')
                .input("Status", sql.VarChar(20), status)
                .input("ReceiptNumber", sql.VarChar(50), mpesaReceiptNumber || null)
                .query(`
                    UPDATE Payments
                    SET Status = @Status, 
                        VerifiedDate = GETDATE(),
                        MpesaReceiptNumber = @ReceiptNumber
                    WHERE PhoneNumber = @PhoneNumber AND Status = 'Pending';
                `);
        } else {
            console.error("M-Pesa Callback missing CheckoutRequestID.");
        }

        res.status(200).send("C2B Callback received successfully");
    } catch (err) {
        console.error("Payment callback error:", err);
        res.status(200).send("Internal processing error");
    }
});

// =====================================
// HEALTH CHECK (From second code block)
// =====================================
app.get("/health", (req, res) => 
    res.json({ status: "ok", ts: new Date() })
);

// =====================================
// START SERVER (From second code block)
// =====================================
const PORT = process.env.PORT || 4050;
async function startServer() {
    try {
        await dbPool; // wait for DB connection to resolve

        console.log("Starting Express server...");
        
        app.listen(PORT, () => 
            console.log(`🚀 Server running on port ${PORT}`)
        );

    } catch (error) {
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
    }
}

startServer();

export default app;