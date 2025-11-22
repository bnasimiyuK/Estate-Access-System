// ==========================================
// backend/db.js
// SQL Server Connection (MSSQL)
// ==========================================

import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

// 🔧 SQL Server Configuration
// ✅ FIX: Added 'export' here so other files can import it as a named export.
export const dbConfig = { 
    user: process.env.DB_USER || "Beverly",
    password: process.env.DB_PASSWORD || "Bev@1234567",
    server: process.env.DB_SERVER || "localhost",
    database: process.env.DB_NAME || "EstateAccessManagementSystem",
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
    options: {
        encrypt: false, // set true if using Azure SQL
        trustServerCertificate: true,
    },
};

// 🧩 Shared SQL Connection Pool
let poolPromise = null;

export const getPool = async () => {
    try {
        if (!poolPromise) {
            poolPromise = sql.connect(dbConfig)
                .then(pool => {
                    console.log("✅ Connected to SQL Server (shared pool)");
                    return pool;
                })
                .catch(err => {
                    console.error("❌ SQL connection failed:", err.message);
                    poolPromise = null; // reset if connection failed
                    throw err;
                });
        }
        return poolPromise;
    } catch (err) {
        console.error("❌ Database Connection Error:", err);
        throw err;
    }
};

// ✅ Export the SQL instance for queries
export { sql };

// ✅ Optional default export (for convenience)
export default { getPool, sql, dbConfig }; // Added dbConfig to default export