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
    getMembershipRequests, 
    getApprovedResidents, 
    getVisitorPasses,
    payController,
    getPaymentStatusController
} from "./controllers/residentsController.js";
import paymentsRoutes from "./routes/paymentRoutes.js";
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
// MPESA CONFIG
// =====================================
export const SHORTCODE = process.env.MPESA_SHORTCODE;
export const PASSKEY = process.env.MPESA_PASSKEY;
export const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
export const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
export const CALLBACK_URL = process.env.MPESA_CALLBACK_URL;

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
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend")));

// =====================================
// ROUTES
// =====================================
app.use("/api/auth", authRoutes);
app.use("/api/residents", residentsRoutes);
app.use("/api/payments", paymentsRoutes);
// DIRECT ROUTE BINDINGS FOR CONTROLLERS (if needed)
app.get("/api/residents/membership", verifyToken, getMembershipRequests);
app.get("/api/residents/approved", verifyToken, getApprovedResidents);
app.get("/api/residents/visitorsaccess", verifyToken, getVisitorPasses);
app.post("/api/residents/pay", verifyToken, payController);
app.get("/api/residents/payment-status", verifyToken, getPaymentStatusController);

// =====================================
// MPESA CALLBACK
// =====================================
app.post("/api/residents/payment-callback", async (req, res) => {
    try {
        const pool = await dbPool;
        const { phone, resultCode } = req.body;
        if (!phone) return res.status(400).send("Phone required");
        const status = resultCode === 0 ? "Verified" : "failed";
        await pool.request()
            .input("PhoneNumber", sql.VarChar(20), phone)
            .input("Status", sql.VarChar(20), status)
            .query(`
                UPDATE Payments
               SET Status = @Status, VerifiedDate = GETDATE()
                WHERE PhoneNumber = @PhoneNumber AND Status = 'pending'
            `);

        res.status(200).send("OK");
    } catch (err) {
        console.error("Payment callback error:", err);
        res.status(500).send("Error");
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
        await dbPool; // wait for DB

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
// ----------------------------------------------------
// 🟢 CORS CONFIGURATION (The Fix)
// ----------------------------------------------------

const corsOptions = {
    // 1. Specify the exact origin allowed (your frontend port)
    origin: 'http://localhost:3000', 
    
    // 2. Allow credentials (important for sending cookies/JWT tokens)
    credentials: true,
    
    // 3. Allow all necessary methods (GET, POST, PATCH, DELETE)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    
    // 4. Specify allowed headers, including 'Authorization' for Bearer tokens
    allowedHeaders: ['Content-Type', 'Authorization'] 
};

app.use(cors(corsOptions)); // Apply CORS middleware

// ----------------------------------------------------

// ... app.use(express.json());
// ... app.use('/api/membership', membershipRoutes);
// ... Start server on port 4050