// =====================================
// LOAD ENVIRONMENT VARIABLES
// =====================================
import dotenv from "dotenv";
dotenv.config();

// =====================================
// IMPORTS (All converted to ES Module syntax)
// =====================================
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import sql from "mssql";
import axios from "axios";

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
    getMembershipRequests, // Used for both resident and admin membership listing
    getApprovedResidents, 
    getVisitorPasses,
    payController,
    getPaymentStatusController,
    approveResidentController 
} from "./controllers/residentsController.js";


// =====================================
// EXPRESS APP SETUP
// =====================================
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================
// MSSQL CONFIG
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
// GLOBAL CONNECTION POOL (PROMISE)
// =====================================
export const dbPool = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log("✅ Connected to MSSQL");
        return pool;
    })
    .catch(err => {
        console.error("❌ MSSQL Connection Error:", err.message);
        process.exit(1);
    });

// =====================================
// MPESA CONFIG 
// =====================================
export const SHORTCODE = process.env.MPESA_SHORTCODE || "174379";
export const PASSKEY = process.env.MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
export const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || "kmOLZ06AIGR4EtIovle2fwsLQU51YbWjdnSG516peEqwADAG";
export const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || "i3JqaV9P75jf5Uz60jhG2R4Ph4Ix9DJs2DbM8UvfCHIjfu2BOmO5i1UTjDeAc2Aj";
// The CALLBACK_URL provided here is used by the M-Pesa API to send back the result.
export const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || "https://yessenia-anthropocentric-nonpersonally.ngrok-free.dev/api/residents/payment-callback";

// =====================================
// GET MPESA TOKEN
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
// MIDDLEWARE (FIXED CORS and order)
// =====================================

// ⚠️ FIX: You had three calls to app.use(cors()). This is redundant and confusing.
// The first, specific corsOptions object is the best practice.
const corsOptions = {
 origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],  // Only allow your frontend
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // Allow cookies/headers
  optionsSuccessStatus: 204 // Best practice for OPTIONS preflight response
};

app.use(cors(corsOptions)); // Apply the single, defined CORS policy

// Use express built-in body parsers *after* CORS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// =====================================
// ROUTES
// =====================================
app.use("/api/auth", authRoutes);
app.use("/api/residents", residentsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/membership", membershipRoutes);

// DIRECT ROUTE BINDINGS FOR RESIDENTS (if needed)
// 💡 Note: If these routes are also defined in residentsRoutes, they will conflict.
app.get("/api/residents/membership", authenticateJWT, getMembershipRequests);
app.get("/api/residents/approved", authenticateJWT, getApprovedResidents);
app.get("/api/residents/visitorsaccess", authenticateJWT, getVisitorPasses);
app.post("/api/residents/pay", authenticateJWT, payController);
app.get("/api/residents/payment-status", authenticateJWT, getPaymentStatusController);

// =========================================================================
// ✅ ADMIN DASHBOARD ROUTES (Addressing 404 errors)
// =========================================================================

// 1. GET /api/dashboard/summary (404 FIX)
app.get("/api/dashboard/summary", authenticateJWT, async (req, res) => { // Added authenticateJWT
    try {
        const pool = await dbPool;
        const result = await pool.request().query(`
            SELECT
                (SELECT COUNT(*) FROM Residents WHERE Status = 'Approved') as ApprovedResidents,
                (SELECT COUNT(*) FROM MembershipRequests WHERE Status = 'Pending') as PendingRequests,
                (SELECT COUNT(*) FROM VisitorPasses WHERE IssuedAt > DATEADD(day, -7, GETDATE())) as WeeklyVisitors;
        `);
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        console.error("Error fetching dashboard summary:", err);
        res.status(500).json({ message: "Failed to fetch summary" });
    }
});


// 2. GET /api/membership/records (404 FIX) - Approved Members
app.get("/api/membership/records", authenticateJWT, getApprovedResidents); 

// 3. GET /api/access/chart (404 FIX)
app.get("/api/access/chart", authenticateJWT, async (req, res) => {
    try {
        const pool = await dbPool;
        const chartDataResult = await pool.request().query(`
            -- Calculate and label the last 7 days of passes
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

// 4. GET /api/membership/requests (404 FIX) - Pending/All Requests
app.get("/api/membership/requests", authenticateJWT, getMembershipRequests);


// =====================================
// MPESA CALLBACK (CRITICAL FIXES APPLIED)
// =====================================
app.post("/api/residents/payment-callback", async (req, res) => {
    try {
        // M-Pesa needs a quick, successful acknowledgment.
        // Process the data in the background and respond immediately.
        res.status(200).send("C2B Callback received successfully"); 
        
        const callbackData = req.body.Body?.stkCallback;
        if (!callbackData) {
            console.warn("Received invalid M-Pesa callback body (No stkCallback):", req.body);
            return; // Exit processing, response already sent
        }

        const resultCode = callbackData.ResultCode;
        const checkoutRequestID = callbackData.CheckoutRequestID;
        const resultDesc = callbackData.ResultDesc; // Useful for logging
        const metadata = callbackData.CallbackMetadata?.Item;
        
        // Log the core transaction result for debugging
        console.log(`M-Pesa Callback for ${checkoutRequestID}. ResultCode: ${resultCode}. Desc: ${resultDesc}`);
        
        let mpesaReceiptNumber = null;
        let phoneNumber = null;

        if (resultCode === 0 && metadata) { // Successful transaction
            mpesaReceiptNumber = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            phoneNumber = metadata.find(item => item.Name === 'PhoneNumber')?.Value;
        }

        const status = resultCode === 0 ? "Verified" : "Failed";

        if (checkoutRequestID) {
            const pool = await dbPool;
            
            // 💡 CRITICAL FIX: The update query must target the transaction by 
            // the unique CheckoutRequestID, NOT by PhoneNumber and Status='Pending'.
            // Linking by PhoneNumber and Status is highly unreliable and dangerous.
            await pool.request()
                .input("Status", sql.VarChar(20), status)
                .input("ReceiptNumber", sql.VarChar(50), mpesaReceiptNumber || null)
                .input("CheckoutRequestID", sql.VarChar(100), checkoutRequestID)
                .query(`
                    UPDATE Payments
                    SET Status = @Status, 
                        VerifiedDate = GETDATE(),
                        MpesaReceiptNumber = @ReceiptNumber 
                    WHERE CheckoutRequestID = @CheckoutRequestID AND Status = 'Pending';
                `);
        } else {
            console.error("M-Pesa Callback missing CheckoutRequestID. Cannot update DB.");
        }

    } catch (err) {
        console.error("Payment callback processing error:", err);
        // The 200 OK was already sent at the top, preventing M-Pesa retries.
    }
});

// =====================================
// HEALTH CHECK
// =====================================
app.get("/health", (req, res) => 
    res.json({ status: "ok", ts: new Date() })
);

// =====================================
// CRITICAL FIX — START SERVER ONLY AFTER DB CONNECTION
// =====================================
async function startServer() {
    try {
        await dbPool; // wait for DB connection to resolve

        console.log("Starting Express server...");
        const PORT = process.env.PORT || 4050;

        app.listen(PORT, () => 
            console.log(`🚀 Server running on port ${PORT}`)
        );

    } catch (error) {
        // The error is already logged and process exited in the dbPool catch block
        console.error("❌ Failed to start server:", error.message);
        process.exit(1); 
    }
}

startServer();