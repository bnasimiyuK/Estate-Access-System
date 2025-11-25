// ===============================================
// server.js (CLEANED & FIXED)
// ===============================================

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import sql from "mssql";
import morgan from "morgan";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import residentsRoutes from "./routes/residentsRoutes.js";
import membershipRoutes from "./routes/membershipRoutes.js";
import paymentsRoutes from "./routes/paymentRoutes.js";
import dashboardRouter from "./routes/dashboard.js";
import adminRoutes from "./routes/adminRoutes.js";
import gateOverridesRoutes from "./routes/gateOverridesRoutes.js";
import accesslogsRoutes from "./routes/accesslogsRoutes.js";
import adminResidentsRoutes from "./routes/adminResidentsRoutes.js";
import visitorsaccessRoutes from "./routes/visitorsaccessRoutes.js";
import courtsRoutes from "./routes/courtsRoutes.js";

// Import Controller
import { getMembershipRequests } from "./controllers/membershipController.js";
// NOTE: getCourtList is likely defined in controllers/courtsController.js,
// but for now, we'll keep it defined here as it was in your original snippet.
export { getCourtList }; 

// Middleware
import { authenticateJWT } from "./middleware/authMiddleware.js";

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
    password: process.env.DB_PASSWORD || "Bev@12345678",
    server: process.env.DB_SERVER || "localhost",
    database: process.env.DB_NAME || "EstateAccessManagementSystem",
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

// =====================================
// GLOBAL CONNECTION POOL
// =====================================
export let dbPool; // Exported for use in controllers

// =====================================
// CORS CONFIG
// =====================================
const allowedOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin || allowedOrigins.includes(origin)) callback(null, true);
        else callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
};

// =====================================
// GLOBAL MIDDLEWARE (CLEANED UP)
// =====================================
app.use(cors(corsOptions)); // Apply configured CORS
app.use(express.json()); // Body parser for JSON payloads
app.use(express.urlencoded({ extended: true })); // Body parser for URL-encoded payloads
app.use(morgan("dev")); // Logging middleware

// Test route
app.get("/", (req, res) => res.send("API running"));

// =====================================
// PUBLIC ROUTES
// =====================================

// Health check
app.get("/health", (req, res) =>
    res.json({ status: "ok", ts: new Date() })
);

// MPESA Callback
app.post("/api/residents/payment-callback", (req, res) => {
    console.log("Received MPESA Callback:", req.body);
    res.status(200).send("OK");
});

// Public API routes
app.use("/api/auth", authRoutes);
app.use("/api/membership", membershipRoutes);
app.use("/api/admin/residents", adminResidentsRoutes);
app.use("/api/visitorsaccess", visitorsaccessRoutes);
app.use("/api", courtsRoutes);
// Gate overrides (PUBLIC)
app.use("/api/gate_overrides", gateOverridesRoutes);

// Admin routes (UNPROTECTED) - If any routes in adminRoutes don't use JWT, they go here
app.use("/api/admin", adminRoutes);

// =====================================
// PROTECTED ROUTES (JWT required)
// =====================================
// Note: If you have protected admin routes, they should be mounted in adminRoutes
// with the authenticateJWT and isAdmin middleware inside that file.

app.use("/api/residents", authenticateJWT, residentsRoutes);
app.use("/api/payments", authenticateJWT, paymentsRoutes);
app.use("/api/dashboard", authenticateJWT, dashboardRouter);
app.use("/api/gate-overrides", authenticateJWT, gateOverridesRoutes);
app.use("/api/accesslogs", authenticateJWT, accesslogsRoutes);

// Direct controller route example
app.get(
    "/api/residents/membership",
    authenticateJWT,
    getMembershipRequests
);

// =====================================
// START SERVER AFTER DB CONNECTION
// =====================================
async function startServer() {
    try {
        dbPool = await new sql.ConnectionPool(dbConfig).connect();
        console.log("✅ Connected to MSSQL Database");

        const PORT = process.env.PORT || 4050;
        app.listen(PORT, () =>
            console.log(`🚀 Server running on port ${PORT}`)
        );
    } catch (error) {
        console.error(
            "❌ Failed to start server or connect to database:",
            error.message
        );
        process.exit(1);
    }
}

// Function to fetch court list (moved from the end of your original server.js)
async function getCourtList(req, res) {
    let pool;
    console.log('Attempting to fetch court list from database...');
    try {
        pool = await dbPool;
        
        const query = `
            SELECT CourtName 
            FROM [dbo].[Courts] 
            WHERE CourtName IS NOT NULL AND CourtName <> '' 
            ORDER BY CourtName
        `;
        
        const result = await pool.request().query(query);
        
        console.log(`SUCCESS: Fetched ${result.recordset.length} court names.`);
        
        res.json(result.recordset); 
    } catch (err) {
        console.error('CRITICAL SERVER ERROR: Failed to fetch court list.');
        console.error(`SQL Error Number: ${err.number}, Message: ${err.message}`);
        res.status(500).json({ message: 'Internal Server Error: Could not load court list.' });
    }
}

startServer();