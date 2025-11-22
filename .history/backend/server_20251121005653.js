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
import sql from "mssql";
import axios from "axios";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import residentsRoutes from "./routes/residentsRoutes.js";
// Middleware
import { verifyToken } from "./middleware/authMiddleware.js";

// Controllers (for optional direct bindings)
import { 
    getMembershipRequests, // Used for both resident and admin membership listing
    getApprovedResidents, 
    getVisitorPasses,
    payController,
    getPaymentStatusController,
    approveResidentController // Assuming you have an approve controller
} from "./controllers/residentsController.js";
import paymentsRoutes from "./routes/paymentRoutes.js";
import dashboardRouter from "./routes/dashboard.js";
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
        console.error("❌ MSSQL Connection Error:", err);
        process.exit(1);
    });

// =====================================
// MPESA CONFIG (Syntax Corrected - Default strings now have quotes)
// =====================================
// NOTE: Please ensure your .env uses MPESA_SHORTCODE, MPESA_PASSKEY, etc.
export const SHORTCODE = process.env.MPESA_SHORTCODE || "174379";
export const PASSKEY = process.env.MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
export const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || "kmOLZ06AIGR4EtIovle2fwsLQU51YbWjdnSG516peEqwADAG";
export const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || "i3JqaV9P75jf5Uz60jhG2R4Ph4Ix9DJs2DbM8UvfCHIjfu2BOmO5i1UTjDeAc2Aj";
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
// MIDDLEWARE
// =====================================
const corsOptions = {
    // 1. Specify the exact origin allowed (your frontend port)
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], 
    
    // 2. Allow credentials (important for sending cookies/JWT tokens)
    credentials: true,
    
    // 3. Allow all necessary methods (GET, POST, PATCH, DELETE)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    
    // 4. Specify allowed headers, including 'Authorization' for Bearer tokens
    allowedHeaders: ['Content-Type', 'Authorization'] 
};

app.use(cors(corsOptions)); // Apply CORS middleware

app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend")));

// =====================================
// ROUTES
// =====================================
app.use("/api/auth", authRoutes);
app.use("/api/residents", residentsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/dashboard", dashboardRouter);

// DIRECT ROUTE BINDINGS FOR RESIDENTS (if needed)
app.get("/api/residents/membership", verifyToken, getMembershipRequests);
app.get("/api/residents/approved", verifyToken, getApprovedResidents);
app.get("/api/residents/visitorsaccess", verifyToken, getVisitorPasses);
app.post("/api/residents/pay", verifyToken, payController);
app.get("/api/residents/payment-status", verifyToken, getPaymentStatusController);


// =========================================================================
// ✅ ADMIN DASHBOARD ROUTES FIX (Addresses all four 404 errors)
// =========================================================================

// 1. GET http://localhost:3000/api/dashboard/summary (404 FIX)
app.get("/api/dashboard/summary", verifyToken, async (req, res) => {
    try {
        const pool = await dbPool;
        // Example: Fetch counts of key entities
        const summaryResult = await pool.request().query(`
            SELECT
                (SELECT COUNT(*) FROM Residents WHERE Status = 'Approved') as ApprovedResidents,
                (SELECT COUNT(*) FROM MembershipRequests WHERE Status = 'Pending') as PendingRequests,
                (SELECT COUNT(*) FROM VisitorPasses WHERE CreatedDate > DATEADD(day, -7, GETDATE())) as WeeklyVisitors;
        `);
        
        res.status(200).json(summaryResult.recordset[0]);
    } catch (err) {
        console.error("Error fetching dashboard summary:", err);
        res.status(500).json({ message: "Failed to fetch dashboard summary." });
    }
});

// 2. GET http://localhost:3000/api/memberships/records (404 FIX)
app.get("/api/memberships/records", verifyToken, getApprovedResidents); 
// Assumption: getApprovedResidents returns the list of approved members (the "records")
// If getApprovedResidents only returns the approved list, this handles the route.

// 3. GET http://localhost:3000/api/access/chart (404 FIX)
app.get("/api/access/chart", verifyToken, async (req, res) => {
    try {
        const pool = await dbPool;
        // Example: Fetch access data for charting (e.g., daily entries/passes)
        const chartDataResult = await pool.request().query(`
            SELECT TOP 7 
                CAST(CreatedDate AS DATE) as Date, 
                COUNT(*) as TotalPasses 
            FROM VisitorPasses 
            GROUP BY CAST(CreatedDate AS DATE)
            ORDER BY Date DESC;
        `);
        
        res.status(200).json(chartDataResult.recordset);
    } catch (err) {
        console.error("Error fetching chart data:", err);
        res.status(500).json({ message: "Failed to fetch chart data." });
    }
});

// 4. GET http://localhost:3000/api/memberships/requests (404 FIX)
app.get("/api/memberships/requests", verifyToken, getMembershipRequests);
// Assumption: getMembershipRequests returns ALL requests, including pending ones (the "requests").

// CRITICAL ADMIN ROUTE EXAMPLE (Already defined in your original code but kept for context)
app.get('/api/admin/memberships', verifyToken, getMembershipRequests); 


// =====================================
// MPESA CALLBACK (Updated logic for M-Pesa standard structure)
// =====================================
app.post("/api/residents/payment-callback", async (req, res) => {
    try {
        // M-Pesa callback data is usually nested deep
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
            // Success: Extract essential details
            mpesaReceiptNumber = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            phoneNumber = metadata.find(item => item.Name === 'PhoneNumber')?.Value;
        }

        // Determine status
        const status = resultCode === 0 ? "Verified" : "Failed";

        // Only update if we have a way to link it back, usually CheckoutRequestID is the primary key for the pending record
        if (checkoutRequestID) {
            const pool = await dbPool;
            
            // The query should ideally link on CheckoutRequestID stored during STK push
            // But since the current DB schema requires updating based on phone, we'll use that (though less reliable)
            // A better query would use a stored CheckoutRequestID
            await pool.request()
                .input("PhoneNumber", sql.VarChar(20), phoneNumber || '')
                .input("Status", sql.VarChar(20), status)
                .input("ReceiptNumber", sql.VarChar(50), mpesaReceiptNumber || null)
                .query(`
                    -- NOTE: Linking by PhoneNumber is risky. Linking by CheckoutRequestID is safer.
                    UPDATE Payments
                    SET Status = @Status, 
                        VerifiedDate = GETDATE(),
                        MpesaReceiptNumber = @ReceiptNumber -- Assuming you add this column
                    WHERE PhoneNumber = @PhoneNumber AND Status = 'Pending';
                `);
        } else {
            console.error("M-Pesa Callback missing CheckoutRequestID.");
        }

        // Send a 200 OK response back to the M-Pesa API regardless of payment status
        res.status(200).send("C2B Callback received successfully");
    } catch (err) {
        console.error("Payment callback error:", err);
        // Do NOT send a 500 status to M-Pesa, as it may retry indefinitely. Send 200.
        res.status(200).send("Internal processing error");
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
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
    }
}

startServer();