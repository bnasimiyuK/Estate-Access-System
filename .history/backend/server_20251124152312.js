// ===============================================
// server.js (CLEAN & FIXED VERSION)
// ===============================================

import dotenv from "dotenv";
dotenv.config();

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
import gateOverridesRoutes from "./routes/gateOverridesRoutes.js";
import accesslogsRoutes from "./routes/accesslogsRoutes.js";
import adminResidentsRoutes from "./routes/adminResidentsRoutes.js";
import visitorsaccessRoutes from "./routes/visitorsaccessRoutes.js";
import courtsRoutes from "./routes/courtsRoutes.js";

// Import Controller
import { getMembershipRequests } from "./controllers/membershipController.js";

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
  password: process.env.DB_PASSWORD || "Bev@1234567",
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
export let dbPool;

// =====================================
// CORS CONFIG
// =====================================
const allowedOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Gate overrides (PUBLIC)
app.use("/api/gate_overrides", gateOverridesRoutes);

// =====================================
// PROTECTED ROUTES (JWT required)
// =====================================
app.use("/api/residents", authenticateJWT, residentsRoutes);
app.use("/api/payments", authenticateJWT, paymentsRoutes);
app.use("/api/dashboard", authenticateJWT, dashboardRouter);
app.use("/api/admin", authenticateJWT, adminRoutes);

// Protected gate overrides API
app.use("/api/gate-overrides", authenticateJWT, gateOverridesRoutes);

app.use("/api/accesslogs", authenticateJWT, accesslogsRoutes);

// Direct controller route
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
export async function getCourtList(req, res) {
    let pool;
    console.log('Attempting to fetch court list from database...');
    try {
        pool = await dbPool;
        
        // This query correctly selects the CourtName column from the Courts table
        const query = `
            SELECT CourtName 
            FROM [dbo].[Courts] 
            WHERE CourtName IS NOT NULL AND CourtName <> '' 
            ORDER BY CourtName
        `;
        
        const result = await pool.request().query(query);
        
        console.log(`SUCCESS: Fetched ${result.recordset.length} court names.`);
        
        // Sends the array of court objects: [{ CourtName: 'Nazareth' }, { CourtName: 'Impala' }, ...]
        res.json(result.recordset); 
    } catch (err) {
        console.error('CRITICAL SERVER ERROR: Failed to fetch court list.');
        console.error(`SQL Error Number: ${err.number}, Message: ${err.message}`);
        res.status(500).json({ message: 'Internal Server Error: Could not load court list.' });
    }
}
startServer();
