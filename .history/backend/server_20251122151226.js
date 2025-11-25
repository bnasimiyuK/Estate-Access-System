// ===============================================
// server.js (FINAL AMENDED VERSION with Database Connection Fix)
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
import adminRoutes from "./routes/adminRoutes.js";
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
// MSSQL CONFIG (Ensure your credentials are correct here or in your .env file)
// =====================================
const dbConfig = { 
    user: process.env.DB_USER || "Beverly",
    password: process.env.DB_PASSWORD || "Bev@1234567",
    server: process.env.DB_SERVER || "localhost", 
    database: process.env.DB_NAME || "EstateAccessManagementSystem",
    options: {
        encrypt: true, // If you are on Azure
        trustServerCertificate: true // Recommended for local dev/self-signed certs
    }
};

// =====================================
// GLOBAL CONNECTION POOL (This will hold the connected pool object)
// Using 'let' so it can be assigned after the connection is established.
// =====================================
export let dbPool; 


// =====================================
// MPESA CONFIG (Configuration Omitted for Brevity)
// =====================================
export const SHORTCODE = process.env.MPESA_SHORTCODE || "174379";
export const PASSKEY = process.env.MPESA_PASSKEY || "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
export const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || "kmOLZ06AIGR4EtIovle2fwsLQU51YbWjdnSG516peEqwADAG";
export const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || "i3JqaV9P75jf5Uz60jhG2R4Ph4Ix9DJs2DbM8UvfCHIjfu2BOmO5i1UTjDeAc2Aj";
export const CALLBACK_URL = process.env.MPESA_CALLBACK_URL || "https://yessenia-anthropocentric-nonpersonally.ngrok-free.dev/api/residents/payment-callback";

// =====================================
// GET MPESA TOKEN (Omitted for Brevity)
// =====================================
export async function getAccessToken() { /* ... */ }

// =====================================
// MIDDLEWARE (FIXED CORS and order)
// =====================================

// Define the origins allowed to access the API 
const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']; 

const corsOptions = { 
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};

// 1. CORS MUST come first for preflight to work correctly
app.use(cors(corsOptions));

// 2. Body Parsers (using built-in Express functionality)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================
// PUBLIC ROUTES DEFINED BEFORE AUTHENTICATION 🚀
// =====================================

// MPESA CALLBACK (Public Route)
app.post("/api/residents/payment-callback", async (req, res) => { /* ... */ });

// ✅ Define Public Routes (Auth and Membership Request) before JWT
app.use("/api/auth", authRoutes); 
app.use("/api/membership", membershipRoutes);


// 3. Apply Global Authentication (This now only protects routes defined below)
app.use(authenticateJWT);


// =====================================
// PROTECTED ROUTES (Requires JWT)
// =====================================
app.use("/api/residents", residentsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/admin", adminRoutes); 
app.use("/api/admin/residents", adminResidentsRoutes);


// DIRECT ROUTE BINDINGS (Protected)
app.get("/api/residents/membership", getMembershipRequests);
app.get("/api/residents/approved", getApprovedResidents);
app.get("/api/residents/visitorsaccess", getVisitorPasses);
app.post("/api/residents/pay", payController);
app.get("/api/residents/payment-status", getPaymentStatusController);
app.put("/api/admin/approve/:id", approveResidentController); 

// =========================================================================
// ADMIN DASHBOARD ROUTES (Protected)
// =========================================================================

// 1. GET /api/dashboard/summary (Protected)
app.get("/api/dashboard/summary", async (req, res) => { /* ... */ });

// 2. GET /api/membership/records - Approved Members (Protected)
app.get("/api/membership/records", getApprovedResidents); 

// 3. GET /api/access/chart (Protected)
app.get("/api/access/chart", async (req, res) => { /* ... */ });

// 4. GET /api/membership/requests - Pending/All Requests (Protected)
app.get("/api/membership/requests", getMembershipRequests);


// =====================================
// HEALTH CHECK
// =====================================
app.get("/health", (req, res) => 
 res.json({ status: "ok", ts: new Date() })
);

// =====================================
// CRITICAL FIX — START SERVER ONLY AFTER DB CONNECTION IS ESTABLISHED
// =====================================
async function startServer() { 
    try {
        // 1. Establish the connection pool and assign it to dbPool
        dbPool = await new sql.ConnectionPool(dbConfig).connect();
        console.log("✅ Connected to MSSQL Database");

        // 2. Start the Express server
        const PORT = process.env.PORT || 4050;
        app.listen(PORT, () => 
            console.log(`🚀 Server running on port ${PORT}`)
        );

    } catch (error) {
        console.error("❌ Failed to start server or connect to database:", error.message);
        // Exit process if connection fails, triggering nodemon restart
        process.exit(1); 
    }
}

startServer();