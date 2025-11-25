// ===============================================
// server.js (JWT-friendly version)
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
import gate_overrides from 
// Import Controllers for direct binding
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
    trustServerCertificate: true
  }
};

// =====================================
// GLOBAL CONNECTION POOL
// =====================================
export let dbPool;

// =====================================
// CORS
// =====================================
const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS Policy'), false);
  },
  credentials: true
};
app.use(cors(corsOptions));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================================
// PUBLIC ROUTES
// =====================================
app.get("/health", (req, res) => res.json({ status: "ok", ts: new Date() }));

app.post("/api/residents/payment-callback", async (req, res) => {
  console.log("Received MPESA Callback:", req.body);
  res.status(200).send("OK");
});

app.use("/api/auth", authRoutes);
app.use("/api/membership", membershipRoutes);
app.use("/api/admin/residents", adminResidentsRoutes);
app.use("/api/visitorsaccess", visitorsaccessRoutes);
app.use("/api/gate_overrides", gate_overridesRoutes);

// =====================================
// PROTECTED ROUTES (JWT required)
// =====================================
app.use("/api/residents", authenticateJWT, residentsRoutes);
app.use("/api/payments", authenticateJWT, paymentsRoutes);
app.use("/api/dashboard", authenticateJWT, dashboardRouter);
app.use("/api/admin", authenticateJWT, adminRoutes);
app.use("/api/gate-overrides", authenticateJWT, gateOverridesRoutes);
app.use("/api/accesslogs", authenticateJWT, accesslogsRoutes);

// Utility direct binding (protected)
app.get("/api/residents/membership", authenticateJWT, getMembershipRequests);

// =====================================
// START SERVER AFTER DB CONNECTION
// =====================================
async function startServer() {
  try {
    dbPool = await new sql.ConnectionPool(dbConfig).connect();
    console.log("✅ Connected to MSSQL Database");

    const PORT = process.env.PORT || 4050;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (error) {
    console.error("❌ Failed to start server or connect to database:", error.message);
    process.exit(1);
  }
}

startServer();
