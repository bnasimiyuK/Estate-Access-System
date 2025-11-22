// ===============================================
// server.js (FINAL AMENDED VERSION)
// ===============================================

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
import adminRoutes from "./routes/adminRoutes.js"; // 💡 FIX: Added missing import for adminRoutes
import adminResidentsRoutes from "./routes/adminResidentsRoutes.js";
// Middleware
import { authenticateJWT } from "./middleware/authMiddleware.js";

// Controllers (for optional direct bindings)
import { 
  getMembershipRequests,
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

// Define the origins allowed to access the API
const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']; 
// Add your production domain here when deploying!

const corsOptions = {
  // Custom function to check if the origin is allowed
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  // Ensure you allow the necessary methods and authentication headers
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization'], // CRITICAL: Allow Authorization header for JWT
  credentials: true, 
  optionsSuccessStatus: 204 // Standard status code for successful preflight OPTIONS
};

// 1. CORS MUST come first for preflight to work correctly
app.use(cors(corsOptions));

// 2. Body Parsers (needed to read JSON/form data)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================
// MPESA CALLBACK (CRITICAL FIXES APPLIED)
// =====================================
// This must be defined before any global authentication middleware!
app.post("/api/residents/payment-callback", async (req, res) => {
  try {
    // Send immediate ACK to M-Pesa to prevent retries
    res.status(200).send("C2B Callback received successfully"); 
    
    const callbackData = req.body.Body?.stkCallback;
    if (!callbackData) {
      console.warn("Received invalid M-Pesa callback body (No stkCallback):", req.body);
      return;
    }

    const resultCode = callbackData.ResultCode;
    const checkoutRequestID = callbackData.CheckoutRequestID;
    const metadata = callbackData.CallbackMetadata?.Item;
    
    console.log(`M-Pesa Callback for ${checkoutRequestID}. ResultCode: ${resultCode}.`);
    
    let mpesaReceiptNumber = null;

    if (resultCode === 0 && metadata) { // Successful transaction
      mpesaReceiptNumber = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
    }

    const status = resultCode === 0 ? "Verified" : "Failed";

    if (checkoutRequestID) {
      const pool = await dbPool;
      
      // 💡 CRITICAL FIX: Update transaction by CheckoutRequestID
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
  }
});

// 4. Apply Global Authentication after public routes (like the callback)
app.use(authenticateJWT);


// =====================================
// ROUTES
// =====================================
app.use("/api/auth", authRoutes); // Auth routes should not use authenticateJWT
app.use("/api/residents", residentsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/membership", membershipRoutes);
app.use("/api/admin", adminRoutes); // 💡 FIX: Variable is now defined
app.use("/api/admin/residents", adminResidentsRoutes);
// DIRECT ROUTE BINDINGS (These are redundant if defined in router files, but kept for completeness)
// They automatically use the global authenticateJWT middleware applied above.
app.get("/api/residents/membership", getMembershipRequests);
app.get("/api/residents/approved", getApprovedResidents);
app.get("/api/residents/visitorsaccess", getVisitorPasses);
app.post("/api/residents/pay", payController);
app.get("/api/residents/payment-status", getPaymentStatusController);
app.put("/api/admin/approve/:id", approveResidentController); // Example using a controller export

// =========================================================================
// ✅ ADMIN DASHBOARD ROUTES (These are now redundant if dashboardRouter is correct, but kept as explicit examples)
// =========================================================================

// 1. GET /api/dashboard/summary
app.get("/api/dashboard/summary", async (req, res) => {
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


// 2. GET /api/membership/records - Approved Members
app.get("/api/membership/records", getApprovedResidents); 

// 3. GET /api/access/chart
app.get("/api/access/chart", async (req, res) => {
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
    
    // Example: Transform data into separate arrays for Chart.js if needed by frontend
    const labels = chartDataResult.recordset.map(row => row.Date.toISOString().split('T')[0]);
    const dataPoints = chartDataResult.recordset.map(row => row.TotalPasses);

    res.status(200).json({ labels: labels, data: dataPoints });
  } catch (err) {
    console.error("Error fetching chart data:", err);
    res.status(500).json({ message: "Failed to fetch chart data." });
  }
});

// 4. GET /api/membership/requests - Pending/All Requests
app.get("/api/membership/requests", getMembershipRequests);


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